<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Contracts\Metadata\MetadataAggregatorInterface;
use App\DTOs\Metadata\MetadataQueryDTO;
use App\Services\Ingestion\LLM\LLMConsultant;
use App\Services\SeedData\SeedDataService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Builds seed data for books by processing a source CSV and enriching via APIs.
 *
 * Reads books from the Kaggle Best Books Ever dataset, enriches them with:
 * - Metadata from Open Library (primary) + Google Books (fallback)
 * - Cover images from Open Library Covers API
 * - Classification (audience, intensity, moods) from Gemini
 *
 * Downloads covers and saves clean data for seeding.
 */
class BuildBookSeedDataCommand extends Command
{
    protected $signature = 'seed-data:build-books
                            {--source= : Source CSV file path (default: books_1.Best_Books_Ever.csv)}
                            {--limit=100 : Maximum number of NEW books to process}
                            {--skip=0 : Number of rows to skip from source}
                            {--no-covers : Skip downloading cover images}
                            {--no-classify : Skip LLM classification}
                            {--force : Reprocess already-processed books}
                            {--dry-run : Show what would be processed without saving}';

    protected $description = 'Build book seed data from Kaggle CSV + Open Library/Google Books + Gemini';

    private const BOOK_HEADERS = [
        'isbn',
        'isbn13',
        'title',
        'author',
        'description',
        'page_count',
        'published_date',
        'publisher',
        'cover_url',
        'cover_filename',
        'series_name',
        'volume_number',
        'series_position',
        'genres',
        'rating',
        'language',
        'audience',
        'intensity',
        'moods',
        'classification_confidence',
    ];

    public function __construct(
        private readonly SeedDataService $seedData,
        private readonly MetadataAggregatorInterface $aggregator,
        private readonly LLMConsultant $llmConsultant
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $sourcePath = $this->option('source') ?: base_path('../books_1.Best_Books_Ever.csv');
        $limit = (int) $this->option('limit');
        $skip = (int) $this->option('skip');
        $downloadCovers = ! $this->option('no-covers');
        $classify = ! $this->option('no-classify');
        $force = $this->option('force');
        $dryRun = $this->option('dry-run');

        if (! file_exists($sourcePath)) {
            $this->error("Source CSV not found: {$sourcePath}");

            return self::FAILURE;
        }

        $alreadyProcessed = $this->seedData->getProcessedCount('books');

        $sources = array_map(fn ($s) => $s->getSourceName(), $this->aggregator->getSources());

        $this->info("Processing books from: {$sourcePath}");
        $this->info("Already processed: {$alreadyProcessed} books");
        $this->info("Limit: {$limit} new books, Skip: {$skip}");
        $this->info('Enrichment sources: '.implode(', ', $sources));
        $this->info('Download covers: '.($downloadCovers ? 'yes' : 'no'));
        $this->info('Classify with Gemini: '.($classify ? ($this->llmConsultant->isEnabled() ? 'yes' : 'DISABLED - no API key') : 'no'));

        if ($force) {
            $this->warn('FORCE MODE - Will reprocess already-processed books');
        }

        if ($dryRun) {
            $this->warn('DRY RUN - No data will be saved');
        }

        $sourceBooks = $this->readSourceCsv($sourcePath, $limit, $skip, $force);

        if (empty($sourceBooks)) {
            $this->info('No new books to process. Use --force to reprocess.');

            return self::SUCCESS;
        }

        $this->info('Found '.count($sourceBooks).' books to process');

        $existingBooks = $this->seedData->readCsv('books');
        $processedBooks = $existingBooks;
        $newCount = 0;
        $coverCount = 0;
        $enrichedCount = 0;
        $classifiedCount = 0;
        $skippedCount = 0;

        $progressBar = $this->output->createProgressBar(count($sourceBooks));
        $progressBar->start();

        foreach ($sourceBooks as $sourceBook) {
            $identifier = $this->getBookIdentifier($sourceBook);

            if (! $force && $this->seedData->isProcessed('books', $identifier)) {
                $skippedCount++;
                $progressBar->advance();

                continue;
            }

            $processed = $this->processBook($sourceBook, $downloadCovers, $classify, $dryRun);

            if ($processed) {
                $processedBooks[] = $processed;
                $newCount++;

                if (! empty($processed['cover_url'])) {
                    $enrichedCount++;
                }

                if (! empty($processed['cover_filename'])) {
                    $coverCount++;
                }

                if (! empty($processed['audience'])) {
                    $classifiedCount++;
                }

                if (! $dryRun) {
                    $this->seedData->markProcessed('books', $identifier, [
                        'title' => $processed['title'],
                        'has_cover' => ! empty($processed['cover_filename']),
                        'is_classified' => ! empty($processed['audience']),
                    ]);
                }
            }

            $progressBar->advance();

            usleep(300000);
        }

        $progressBar->finish();
        $this->newLine(2);

        if (! $dryRun && $newCount > 0) {
            $savedCount = $this->seedData->writeCsv('books', $processedBooks, self::BOOK_HEADERS);
            $this->info("Saved {$savedCount} books to seed data (total)");
        }

        $this->table(
            ['Metric', 'Count'],
            [
                ['New books processed', $newCount],
                ['Books skipped (already processed)', $skippedCount],
                ['Books enriched (cover URL)', $enrichedCount],
                ['Covers downloaded', $coverCount],
                ['Books classified (Gemini)', $classifiedCount],
                ['Total books in seed data', count($processedBooks)],
            ]
        );

        return self::SUCCESS;
    }

    /**
     * Get a unique identifier for a book.
     *
     * Uses title-based identifier to avoid collisions from scientific notation
     * precision loss in ISBN fields.
     */
    private function getBookIdentifier(array $sourceBook): string
    {
        $title = $sourceBook['title'] ?? 'unknown';
        $author = $sourceBook['author'] ?? '';

        $authorPart = explode(',', $author)[0];

        return Str::slug($title.'-'.$authorPart);
    }

    /**
     * Read the source Kaggle CSV, filtering out already-processed books.
     *
     * @return array<int, array<string, string>>
     */
    private function readSourceCsv(string $path, int $limit, int $skip, bool $force): array
    {
        $books = [];
        $handle = fopen($path, 'r');

        if ($handle === false) {
            return [];
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);

            return [];
        }

        $currentRow = 0;
        $newBooksFound = 0;

        while (($data = fgetcsv($handle)) !== false) {
            if ($currentRow < $skip) {
                $currentRow++;

                continue;
            }

            if ($newBooksFound >= $limit) {
                break;
            }

            if (count($data) === count($headers)) {
                $row = array_combine($headers, $data);

                if (! empty($row['title']) && ! empty($row['author'])) {
                    $identifier = $this->getBookIdentifier($row);

                    if ($force || ! $this->seedData->isProcessed('books', $identifier)) {
                        $books[] = $row;
                        $newBooksFound++;
                    }
                }
            }

            $currentRow++;
        }

        fclose($handle);

        return $books;
    }

    /**
     * Process a single book from the source CSV.
     *
     * @return array<string, mixed>|null
     */
    private function processBook(array $sourceBook, bool $downloadCovers, bool $classify, bool $dryRun): ?array
    {
        $title = trim($sourceBook['title'] ?? '');
        $author = $this->cleanAuthor($sourceBook['author'] ?? '');

        if (empty($title)) {
            return null;
        }

        $book = [
            'isbn' => '',
            'isbn13' => '',
            'title' => $title,
            'author' => $author,
            'description' => $this->cleanDescription($sourceBook['description'] ?? ''),
            'page_count' => $this->parsePageCount($sourceBook['pages'] ?? ''),
            'published_date' => $this->parsePublishDate($sourceBook['firstPublishDate'] ?? $sourceBook['publishDate'] ?? ''),
            'publisher' => trim($sourceBook['publisher'] ?? ''),
            'cover_url' => '',
            'cover_filename' => '',
            'series_name' => $this->parseSeriesName($sourceBook['series'] ?? ''),
            'volume_number' => $this->parseVolumeNumber($sourceBook['series'] ?? ''),
            'series_position' => '',
            'genres' => $this->parseGenres($sourceBook['genres'] ?? ''),
            'rating' => $this->parseRating($sourceBook['rating'] ?? ''),
            'language' => strtolower(trim($sourceBook['language'] ?? 'english')),
            'audience' => '',
            'intensity' => '',
            'moods' => '',
            'classification_confidence' => null,
        ];

        $enrichment = $this->enrichBook(null, $title, $author);

        if ($enrichment) {
            if (! empty($enrichment['cover_url'])) {
                $book['cover_url'] = $enrichment['cover_url'];
            }

            if (empty($book['description']) && ! empty($enrichment['description'])) {
                $book['description'] = $enrichment['description'];
            }

            if (empty($book['page_count']) && ! empty($enrichment['page_count'])) {
                $book['page_count'] = $enrichment['page_count'];
            }

            if (empty($book['published_date']) && ! empty($enrichment['published_date'])) {
                $book['published_date'] = $enrichment['published_date'];
            }

            if (! empty($enrichment['isbn'])) {
                $book['isbn'] = $enrichment['isbn'];
            }

            if (! empty($enrichment['isbn13'])) {
                $book['isbn13'] = $enrichment['isbn13'];
            } elseif (! empty($enrichment['isbn']) && strlen($enrichment['isbn']) === 13) {
                $book['isbn13'] = $enrichment['isbn'];
            }

            if (! empty($enrichment['publisher'])) {
                $book['publisher'] = $enrichment['publisher'];
            }

            if (empty($book['series_name']) && ! empty($enrichment['series_name'])) {
                $book['series_name'] = $enrichment['series_name'];
            }

            if (empty($book['volume_number']) && ! empty($enrichment['volume_number'])) {
                $book['volume_number'] = $enrichment['volume_number'];
            }
        }

        if ($downloadCovers && ! $dryRun && ! empty($book['cover_url'])) {
            $identifier = $book['isbn13'] ?: $book['isbn'] ?: Str::slug($title);
            $filename = $this->seedData->downloadMedia('books', $book['cover_url'], $identifier);

            if ($filename) {
                $book['cover_filename'] = $filename;
            }
        }

        if ($classify && ! empty($book['description'])) {
            $classification = $this->classifyWithGemini($book);

            if ($classification) {
                $book['audience'] = $classification['audience'] ?? '';
                $book['intensity'] = $classification['intensity'] ?? '';
                $book['moods'] = $classification['moods'] ?? '';
                $book['classification_confidence'] = $classification['confidence'] ?? null;

                if (empty($book['series_name']) && ! empty($classification['series_name'])) {
                    $book['series_name'] = $classification['series_name'];
                    $book['volume_number'] = $classification['volume_hint'] ?? '';
                }

                if (! empty($classification['series_position'])) {
                    $book['series_position'] = $classification['series_position'];
                }
            }
        }

        return $book;
    }

    /**
     * Classify book content using Gemini LLM.
     *
     * @return array<string, mixed>|null
     */
    private function classifyWithGemini(array $book): ?array
    {
        if (! $this->llmConsultant->isEnabled()) {
            return null;
        }

        try {
            $genres = ! empty($book['genres'])
                ? array_map('trim', explode(',', $book['genres']))
                : [];

            $result = $this->llmConsultant->classifyBook(
                title: $book['title'],
                description: $book['description'],
                author: $book['author'],
                genres: $genres
            );

            $contentClassification = $result['content'] ?? null;
            $seriesExtraction = $result['series'] ?? null;

            if (! $contentClassification) {
                return null;
            }

            $moods = [];
            if (! empty($contentClassification->moods)) {
                $moods = array_map(fn ($m) => $m->value, $contentClassification->moods);
            }

            $output = [
                'audience' => $contentClassification->audience?->value ?? '',
                'intensity' => $contentClassification->intensity?->value ?? '',
                'moods' => implode(', ', $moods),
                'confidence' => $contentClassification->confidence,
            ];

            if ($seriesExtraction && $seriesExtraction->seriesMentioned) {
                $output['series_name'] = $seriesExtraction->seriesName;
                $output['series_position'] = $seriesExtraction->positionHint?->value ?? '';
                $output['volume_hint'] = $seriesExtraction->volumeHint;
            }

            return $output;
        } catch (\Exception $e) {
            $this->warn("Classification failed for '{$book['title']}': {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Enrich book data from external APIs using scatter-gather aggregation.
     *
     * Queries all configured sources in parallel, scores results,
     * and merges the best fields from each source.
     *
     * @return array<string, mixed>|null
     */
    private function enrichBook(?string $isbn, string $title, ?string $author): ?array
    {
        try {
            $query = new MetadataQueryDTO(
                isbn: $isbn,
                title: $title,
                author: $author
            );

            $result = $this->aggregator->aggregate($query);

            if (!$result->hasData()) {
                return null;
            }

            return $result->toSeedDataArray();
        } catch (\Exception $e) {
            $this->warn("Book enrichment failed for '{$title}': {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Clean and normalize ISBN.
     *
     * Handles scientific notation (e.g., 9.78044E+12) from Excel exports.
     */
    private function cleanIsbn(string $isbn): string
    {
        $isbn = trim($isbn);

        if (stripos($isbn, 'E+') !== false || stripos($isbn, 'E-') !== false) {
            $number = (float) $isbn;
            $isbn = number_format($number, 0, '', '');
        }

        $cleaned = preg_replace('/[^\dXx]/', '', $isbn);

        if (strlen($cleaned) === 10 || strlen($cleaned) === 13) {
            return $cleaned;
        }

        if (preg_match('/(\d{10}|\d{13})/', $cleaned, $matches)) {
            return $matches[1];
        }

        return '';
    }

    /**
     * Extract ISBN-13 from the ISBN field.
     *
     * Handles scientific notation (e.g., 9.78044E+12) from Excel exports.
     */
    private function extractIsbn13(string $isbn): string
    {
        $isbn = trim($isbn);

        if (stripos($isbn, 'E+') !== false || stripos($isbn, 'E-') !== false) {
            $number = (float) $isbn;
            $isbn = number_format($number, 0, '', '');
        }

        $cleaned = preg_replace('/[^\d]/', '', $isbn);

        if (strlen($cleaned) >= 13) {
            $potential = substr($cleaned, 0, 13);

            if (str_starts_with($potential, '978') || str_starts_with($potential, '979')) {
                return $potential;
            }
        }

        return '';
    }

    /**
     * Clean author string, removing illustrator credits etc.
     */
    private function cleanAuthor(string $author): string
    {
        $author = preg_replace('/\s*\([^)]*(?:Illustrator|Editor|Translator|Introduction|Narrator|Foreword|Preface)[^)]*\)/i', '', $author);

        $author = preg_replace('/,\s*[^,]+\s*\([^)]*(?:Illustrator|Editor)[^)]*\)/', '', $author);

        return trim($author, ', ');
    }

    /**
     * Clean and truncate description.
     */
    private function cleanDescription(string $description): string
    {
        $description = preg_replace('/^(Librarian\'s note:|Note:|ISBN \d+|Alternate cover)[^.]*\.\s*/i', '', $description);

        $description = trim($description);

        if (strlen($description) > 2000) {
            $description = substr($description, 0, 1997).'...';
        }

        return $description;
    }

    /**
     * Parse page count from string.
     */
    private function parsePageCount(string $pages): ?int
    {
        $count = (int) preg_replace('/[^\d]/', '', $pages);

        return $count > 0 && $count < 10000 ? $count : null;
    }

    /**
     * Parse and normalize publish date.
     */
    private function parsePublishDate(string $date): ?string
    {
        $date = trim($date);

        if (empty($date)) {
            return null;
        }

        if (preg_match('/(\d{4})/', $date, $matches)) {
            $year = (int) $matches[1];

            if ($year >= 1000 && $year <= 2030) {
                if (preg_match('/(\d{2})[-\/](\d{2})[-\/](\d{2,4})/', $date, $m)) {
                    return $year.'-01-01';
                }

                return $year.'-01-01';
            }
        }

        return null;
    }

    /**
     * Parse series name from series string (e.g., "Harry Potter #5" -> "Harry Potter").
     */
    private function parseSeriesName(string $series): string
    {
        $series = trim($series);

        if (empty($series)) {
            return '';
        }

        $series = preg_replace('/#[\d\-,\s]+$/', '', $series);
        $series = preg_replace('/\s*\(.*\)/', '', $series);

        return trim($series);
    }

    /**
     * Parse volume number from series string (e.g., "Harry Potter #5" -> 5).
     */
    private function parseVolumeNumber(string $series): ?int
    {
        if (preg_match('/#(\d+)/', $series, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    /**
     * Parse genres from string representation of array.
     */
    private function parseGenres(string $genres): string
    {
        $genres = trim($genres, "[] \t\n\r\0\x0B");
        $genres = str_replace(["'", '"'], '', $genres);

        $genreList = array_map('trim', explode(',', $genres));
        $genreList = array_filter($genreList);

        $genreList = array_slice($genreList, 0, 5);

        return implode(', ', $genreList);
    }

    /**
     * Parse rating as float.
     */
    private function parseRating(string $rating): ?float
    {
        $value = (float) $rating;

        return ($value > 0 && $value <= 5) ? round($value, 2) : null;
    }
}
