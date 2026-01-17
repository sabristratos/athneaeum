<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Contracts\Metadata\MetadataAggregatorInterface;
use App\DTOs\Metadata\MetadataQueryDTO;
use App\Enums\BookStatusEnum;
use App\Services\Ingestion\LLM\LLMConsultant;
use App\Services\SeedData\SeedDataService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use League\Csv\Reader;

/**
 * Builds seed data for Goodreads export books.
 *
 * Reads books from a Goodreads CSV export, enriches them with:
 * - Metadata from Open Library (primary) + Google Books (fallback)
 * - Cover images from Open Library Covers API
 * - Classification (audience, intensity, moods, vibes) from Gemini
 *
 * Downloads covers and saves clean data for seeding.
 */
class BuildGoodreadsSeedDataCommand extends Command
{
    protected $signature = 'seed-data:build-goodreads
                            {--source= : Source Goodreads CSV file path (required)}
                            {--limit=10 : Maximum number of books to process}
                            {--skip=0 : Number of rows to skip from source}
                            {--no-covers : Skip downloading cover images}
                            {--no-classify : Skip LLM classification}
                            {--force : Reprocess already-processed books}
                            {--dry-run : Show what would be processed without saving}';

    protected $description = 'Build Goodreads export seed data with covers and LLM classification';

    private const GOODREADS_HEADERS = [
        'goodreads_id',
        'isbn13',
        'isbn10',
        'title',
        'author',
        'additional_authors',
        'description',
        'page_count',
        'published_date',
        'publisher',
        'cover_url',
        'cover_filename',
        'genres',
        'series_name',
        'volume_number',
        'binding',
        'average_rating',
        'user_rating',
        'user_review',
        'user_status',
        'user_shelves',
        'date_added',
        'date_read',
        'audience',
        'intensity',
        'moods',
        'classification_confidence',
        'mood_darkness',
        'pacing_speed',
        'complexity_score',
        'emotional_intensity',
        'plot_archetype',
        'prose_style',
        'setting_atmosphere',
        'vibe_confidence',
    ];

    public function __construct(
        private readonly SeedDataService $seedData,
        private readonly MetadataAggregatorInterface $aggregator,
        private readonly LLMConsultant $llmConsultant,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $sourcePath = $this->option('source');

        if (empty($sourcePath)) {
            $this->error('The --source option is required. Provide path to Goodreads CSV export.');

            return self::FAILURE;
        }

        if (! file_exists($sourcePath)) {
            $sourcePath = base_path($sourcePath);

            if (! file_exists($sourcePath)) {
                $this->error("Source CSV not found: {$sourcePath}");

                return self::FAILURE;
            }
        }

        $limit = (int) $this->option('limit');
        $skip = (int) $this->option('skip');
        $downloadCovers = ! $this->option('no-covers');
        $classify = ! $this->option('no-classify');
        $force = $this->option('force');
        $dryRun = $this->option('dry-run');

        $alreadyProcessed = $this->seedData->getProcessedCount('goodreads');

        $this->info("Processing Goodreads books from: {$sourcePath}");
        $this->info("Already processed: {$alreadyProcessed} Goodreads books");
        $this->info("Limit: {$limit} new books, Skip: {$skip}");
        $this->info('Download covers: '.($downloadCovers ? 'yes' : 'no'));
        $this->info('Classify with Gemini: '.($classify ? ($this->llmConsultant->isEnabled() ? 'yes' : 'DISABLED - no API key') : 'no'));

        if ($force) {
            $this->warn('FORCE MODE - Will reprocess already-processed books');
        }

        if ($dryRun) {
            $this->warn('DRY RUN - No data will be saved');
        }

        $this->newLine();

        $sourceBooks = $this->readSourceCsv($sourcePath, $limit, $skip, $force);

        if (empty($sourceBooks)) {
            $this->info('No new books to process. Use --force to reprocess.');

            return self::SUCCESS;
        }

        $this->info('Found '.count($sourceBooks).' books to process');
        $this->newLine();

        $newCount = 0;
        $coverCount = 0;
        $coverSkippedCount = 0;
        $enrichedCount = 0;
        $classifiedCount = 0;
        $skippedCount = 0;

        $progressBar = $this->output->createProgressBar(count($sourceBooks));
        $progressBar->start();

        foreach ($sourceBooks as $sourceBook) {
            $identifier = $this->getBookIdentifier($sourceBook);

            if (! $force && $this->seedData->isProcessed('goodreads', $identifier)) {
                $skippedCount++;
                $progressBar->advance();

                continue;
            }

            $processed = $this->processBook($sourceBook, $downloadCovers, $classify, $dryRun, $coverSkippedCount);

            if ($processed) {
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
                    $saved = $this->seedData->saveBookToCsv('goodreads', $processed, self::GOODREADS_HEADERS, 'goodreads_id');

                    if ($saved) {
                        $this->seedData->markProcessed('goodreads', $identifier, [
                            'title' => $processed['title'],
                            'has_cover' => ! empty($processed['cover_filename']),
                            'is_classified' => ! empty($processed['audience']),
                        ]);
                    } else {
                        $this->warn("  Failed to save '{$processed['title']}' to CSV");
                    }
                }

                $this->newLine();
                $this->line("  <info>{$processed['title']}</info> by {$processed['author']}");

                if (! empty($processed['audience'])) {
                    $this->line("    Audience: {$processed['audience']}, Intensity: {$processed['intensity']}");
                    $this->line("    Moods: {$processed['moods']}");
                }

                if (! empty($processed['mood_darkness'])) {
                    $this->line("    Vibes: darkness={$processed['mood_darkness']}, pacing={$processed['pacing_speed']}, complexity={$processed['complexity_score']}");
                    $this->line("    Plot: {$processed['plot_archetype']}, Style: {$processed['prose_style']}, Setting: {$processed['setting_atmosphere']}");
                }

                if (! empty($processed['cover_filename'])) {
                    $this->line("    Cover: {$processed['cover_filename']}");
                }
            }

            $progressBar->advance();

            usleep(500000);
        }

        $progressBar->finish();
        $this->newLine(2);

        $totalBooks = $this->seedData->getProcessedCount('goodreads');
        $this->info("Total books in seed data: {$totalBooks}");

        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                ['New books processed', $newCount],
                ['Books skipped (already processed)', $skippedCount],
                ['Books enriched (cover URL)', $enrichedCount],
                ['Covers downloaded', $coverCount],
                ['Covers skipped (already exist)', $coverSkippedCount],
                ['Books classified (Gemini)', $classifiedCount],
                ['Total books in seed data', $totalBooks],
            ]
        );

        return self::SUCCESS;
    }

    /**
     * Get a unique identifier for a book.
     *
     * Supports both Goodreads export and Kaggle "Best Books Ever" formats.
     */
    private function getBookIdentifier(array $sourceBook): string
    {
        $goodreadsId = $sourceBook['Book Id'] ?? '';
        if (! empty($goodreadsId)) {
            return 'gr-'.$goodreadsId;
        }

        $isbn13 = $this->cleanIsbn($sourceBook['ISBN13'] ?? $sourceBook['isbn'] ?? '');
        if (! empty($isbn13)) {
            return 'gr-'.$isbn13;
        }

        $title = $sourceBook['Title'] ?? $sourceBook['title'] ?? 'unknown';
        $author = $sourceBook['Author'] ?? $sourceBook['author'] ?? '';

        return 'gr-'.Str::slug($title.'-'.$author);
    }

    /**
     * Read the source Goodreads CSV.
     *
     * Supports both standard Goodreads export format and Kaggle "Best Books Ever" format.
     *
     * @return array<int, array<string, string>>
     */
    private function readSourceCsv(string $path, int $limit, int $skip, bool $force): array
    {
        $books = [];

        $reader = Reader::createFromPath($path, 'r');
        $reader->setHeaderOffset(0);

        $currentRow = 0;
        $newBooksFound = 0;

        foreach ($reader->getRecords() as $record) {
            if ($currentRow < $skip) {
                $currentRow++;

                continue;
            }

            if ($newBooksFound >= $limit) {
                break;
            }

            $title = $record['Title'] ?? $record['title'] ?? null;

            if (! empty($title)) {
                $identifier = $this->getBookIdentifier($record);

                if ($force || ! $this->seedData->isProcessed('goodreads', $identifier)) {
                    $books[] = $record;
                    $newBooksFound++;
                }
            }

            $currentRow++;
        }

        return $books;
    }

    /**
     * Process a single book from the source CSV.
     *
     * Supports both Goodreads export and Kaggle "Best Books Ever" formats.
     *
     * @return array<string, mixed>|null
     */
    private function processBook(
        array $sourceBook,
        bool $downloadCovers,
        bool $classify,
        bool $dryRun,
        int &$coverSkippedCount = 0,
    ): ?array {
        $title = trim($sourceBook['Title'] ?? $sourceBook['title'] ?? '');
        $author = trim($sourceBook['Author'] ?? $sourceBook['author'] ?? '');
        $isbn13 = $this->cleanIsbn($sourceBook['ISBN13'] ?? $sourceBook['isbn'] ?? '');
        $isbn10 = $this->cleanIsbn($sourceBook['ISBN'] ?? '');

        if (empty($title)) {
            return null;
        }

        $seriesInfo = $this->parseSeriesInfo($sourceBook);
        $genres = $this->parseGenres($sourceBook);

        $book = [
            'goodreads_id' => trim($sourceBook['Book Id'] ?? ''),
            'isbn13' => $isbn13,
            'isbn10' => $isbn10,
            'title' => $title,
            'author' => $this->cleanAuthor($author),
            'additional_authors' => trim($sourceBook['Additional Authors'] ?? ''),
            'description' => trim($sourceBook['description'] ?? ''),
            'page_count' => $this->parseInt($sourceBook['Number of Pages'] ?? $sourceBook['pages'] ?? null),
            'published_date' => $this->normalizePublishedDate($sourceBook),
            'publisher' => trim($sourceBook['Publisher'] ?? $sourceBook['publisher'] ?? ''),
            'cover_url' => '',
            'cover_filename' => '',
            'genres' => $genres,
            'series_name' => $seriesInfo['name'],
            'volume_number' => $seriesInfo['number'],
            'binding' => trim($sourceBook['Binding'] ?? $sourceBook['bookFormat'] ?? ''),
            'average_rating' => $this->parseFloat($sourceBook['Average Rating'] ?? $sourceBook['rating'] ?? null),
            'user_rating' => $this->parseFloat($sourceBook['My Rating'] ?? null),
            'user_review' => trim($sourceBook['My Review'] ?? ''),
            'user_status' => $this->mapStatus($sourceBook['Exclusive Shelf'] ?? ''),
            'user_shelves' => trim($sourceBook['Bookshelves'] ?? ''),
            'date_added' => $this->parseGoodreadsDate($sourceBook['Date Added'] ?? null),
            'date_read' => $this->parseGoodreadsDate($sourceBook['Date Read'] ?? null),
            'audience' => '',
            'intensity' => '',
            'moods' => '',
            'classification_confidence' => null,
            'mood_darkness' => null,
            'pacing_speed' => null,
            'complexity_score' => null,
            'emotional_intensity' => null,
            'plot_archetype' => '',
            'prose_style' => '',
            'setting_atmosphere' => '',
            'vibe_confidence' => null,
        ];

        $enrichment = $this->enrichBook($isbn13 ?: $isbn10, $title, $author);

        if ($enrichment) {
            if (empty($book['isbn13']) && ! empty($enrichment['isbn13'])) {
                $book['isbn13'] = $enrichment['isbn13'];
            }

            if (empty($book['isbn10']) && ! empty($enrichment['isbn10'])) {
                $book['isbn10'] = $enrichment['isbn10'];
            }

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

            if (empty($book['publisher']) && ! empty($enrichment['publisher'])) {
                $book['publisher'] = $enrichment['publisher'];
            }

            if (! empty($enrichment['genres'])) {
                $book['genres'] = is_array($enrichment['genres'])
                    ? implode(', ', $enrichment['genres'])
                    : $enrichment['genres'];
            }

            if (! empty($enrichment['series_name'])) {
                $book['series_name'] = $enrichment['series_name'];
                $book['volume_number'] = $enrichment['volume_number'] ?? '';
            }

            if (! empty($enrichment['olid'])) {
                $book['olid'] = $enrichment['olid'];
            }

            if (! empty($enrichment['cover_id'])) {
                $book['cover_id'] = $enrichment['cover_id'];
            }

            if (! empty($enrichment['google_cover_url'])) {
                $book['google_cover_url'] = $enrichment['google_cover_url'];
            }

            if (! empty($enrichment['cover_url_fallback'])) {
                $book['cover_url_fallback'] = $enrichment['cover_url_fallback'];
            }
        }

        if ($downloadCovers && ! $dryRun && (! empty($book['isbn13']) || ! empty($book['isbn10']) || ! empty($book['goodreads_id']))) {
            $identifier = $book['isbn13'] ?: $book['isbn10'] ?: $book['goodreads_id'] ?: Str::slug($book['title'].'-'.$book['author']);

            $existingCover = $this->seedData->coverExists('goodreads', $identifier);
            if ($existingCover) {
                $book['cover_filename'] = $existingCover;
                $coverSkippedCount++;
            } else {
                $coverFilename = $this->downloadCover($book);

                if ($coverFilename) {
                    $book['cover_filename'] = $coverFilename;
                }
            }
        }

        if ($classify && ! empty($book['description'])) {
            $classification = $this->classifyWithGemini($book);

            if ($classification) {
                $book['audience'] = $classification['audience'] ?? '';
                $book['intensity'] = $classification['intensity'] ?? '';
                $book['moods'] = $classification['moods'] ?? '';
                $book['classification_confidence'] = $classification['confidence'] ?? null;

                if (! empty($classification['mood_darkness'])) {
                    $book['mood_darkness'] = $classification['mood_darkness'];
                    $book['pacing_speed'] = $classification['pacing_speed'];
                    $book['complexity_score'] = $classification['complexity_score'];
                    $book['emotional_intensity'] = $classification['emotional_intensity'];
                    $book['plot_archetype'] = $classification['plot_archetype'];
                    $book['prose_style'] = $classification['prose_style'];
                    $book['setting_atmosphere'] = $classification['setting_atmosphere'];
                    $book['vibe_confidence'] = $classification['vibe_confidence'];
                }

                if (empty($book['series_name']) && ! empty($classification['series_name'])) {
                    $book['series_name'] = $classification['series_name'];
                    $book['volume_number'] = $classification['volume_hint'] ?? '';
                }
            }
        }

        return $book;
    }

    /**
     * Download cover image using waterfall strategy.
     */
    private function downloadCover(array $book): ?string
    {
        $identifier = $book['isbn13'] ?: $book['isbn10'] ?: $book['goodreads_id'] ?: Str::slug($book['title'].'-'.$book['author']);
        $coverUrls = $this->buildCoverWaterfall($book);

        foreach ($coverUrls as $source => $url) {
            if (empty($url)) {
                continue;
            }

            try {
                $response = Http::timeout(15)
                    ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                    ->get($url);

                if (! $response->successful()) {
                    continue;
                }

                $imageData = $response->body();

                if (strlen($imageData) < 1000) {
                    continue;
                }

                $filename = $this->seedData->downloadMedia('goodreads', $url, $identifier);

                if ($filename) {
                    return $filename;
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        return null;
    }

    /**
     * Build cover URL waterfall with multiple fallback sources.
     *
     * Priority order:
     * 1. Enriched cover_url (aggregator already validated this works)
     * 2. Enriched cover_url_fallback
     * 3. Cover ID from Open Library
     * 4. Google Books thumbnail
     * 5. ISBN-based lookups (last resort, use ?default=false)
     *
     * @return array<string, string|null>
     */
    private function buildCoverWaterfall(array $book): array
    {
        $urls = [];

        if (! empty($book['cover_url'])) {
            $urls['enriched'] = $book['cover_url'];
        }

        if (! empty($book['cover_url_fallback'])) {
            $urls['enriched_fallback'] = $book['cover_url_fallback'];
        }

        if (! empty($book['cover_id'])) {
            $urls['ol_id_L'] = "https://covers.openlibrary.org/b/id/{$book['cover_id']}-L.jpg";
        }

        if (! empty($book['google_cover_url'])) {
            $googleUrl = $book['google_cover_url'];
            $googleUrl = preg_replace('/zoom=\d/', 'zoom=3', $googleUrl);
            $urls['google_books'] = $googleUrl;
        }

        if (! empty($book['olid'])) {
            $urls['ol_olid_L'] = "https://covers.openlibrary.org/b/olid/{$book['olid']}-L.jpg?default=false";
        }

        if (! empty($book['isbn13'])) {
            $urls['ol_isbn13_L'] = "https://covers.openlibrary.org/b/isbn/{$book['isbn13']}-L.jpg?default=false";
        }

        if (! empty($book['isbn10'])) {
            $urls['ol_isbn10_L'] = "https://covers.openlibrary.org/b/isbn/{$book['isbn10']}-L.jpg?default=false";
        }

        return $urls;
    }

    /**
     * Classify book content using Gemini LLM (including vibes).
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
            $vibeClassification = $result['vibes'] ?? null;

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

            if ($vibeClassification && $vibeClassification->hasData()) {
                $output['mood_darkness'] = $vibeClassification->moodDarkness;
                $output['pacing_speed'] = $vibeClassification->pacingSpeed;
                $output['complexity_score'] = $vibeClassification->complexityScore;
                $output['emotional_intensity'] = $vibeClassification->emotionalIntensity;
                $output['plot_archetype'] = $vibeClassification->plotArchetype?->value ?? '';
                $output['prose_style'] = $vibeClassification->proseStyle?->value ?? '';
                $output['setting_atmosphere'] = $vibeClassification->settingAtmosphere?->value ?? '';
                $output['vibe_confidence'] = $vibeClassification->confidence;
            }

            if ($seriesExtraction && $seriesExtraction->seriesMentioned) {
                $output['series_name'] = $seriesExtraction->seriesName;
                $output['volume_hint'] = $seriesExtraction->volumeHint;
            }

            return $output;
        } catch (\Exception $e) {
            $this->warn("Classification failed for '{$book['title']}': {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Enrich book data from external APIs.
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

            if (! $result->hasData()) {
                return null;
            }

            $data = $result->toSeedDataArray();

            $openLibraryData = $this->fetchOpenLibraryEdition($isbn);
            if ($openLibraryData) {
                if (! empty($openLibraryData['olid'])) {
                    $data['olid'] = $openLibraryData['olid'];
                }
                if (! empty($openLibraryData['cover_id'])) {
                    $data['cover_id'] = $openLibraryData['cover_id'];
                }
            }

            $googleData = $this->fetchGoogleBooksCover($isbn, $title, $author);
            if (! empty($googleData['thumbnail'])) {
                $data['google_cover_url'] = $googleData['thumbnail'];
            }

            return $data;
        } catch (\Exception $e) {
            $this->warn("Book enrichment failed for '{$title}': {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Fetch Open Library edition data for OLID and cover_id.
     *
     * @return array{olid: ?string, cover_id: ?int}|null
     */
    private function fetchOpenLibraryEdition(?string $isbn): ?array
    {
        if (empty($isbn)) {
            return null;
        }

        try {
            $response = Http::timeout(10)
                ->get("https://openlibrary.org/isbn/{$isbn}.json");

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();

            $olid = null;
            if (! empty($data['key'])) {
                $olid = str_replace('/books/', '', $data['key']);
            }

            $coverId = null;
            if (! empty($data['covers']) && is_array($data['covers'])) {
                $coverId = $data['covers'][0];
            }

            return [
                'olid' => $olid,
                'cover_id' => $coverId,
            ];
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Fetch Google Books cover URL.
     *
     * Tries ISBN first, then falls back to title/author search.
     *
     * @return array{thumbnail: ?string}|null
     */
    private function fetchGoogleBooksCover(?string $isbn, string $title, ?string $author): ?array
    {
        $queries = [];

        if (! empty($isbn)) {
            $queries[] = "isbn:{$isbn}";
        }

        $queries[] = "intitle:{$title}".($author ? "+inauthor:{$author}" : '');

        foreach ($queries as $query) {
            try {
                $response = Http::timeout(10)
                    ->get('https://www.googleapis.com/books/v1/volumes', [
                        'q' => $query,
                        'maxResults' => 1,
                    ]);

                if (! $response->successful()) {
                    continue;
                }

                $data = $response->json();
                $items = $data['items'] ?? [];

                if (empty($items)) {
                    continue;
                }

                $imageLinks = $items[0]['volumeInfo']['imageLinks'] ?? [];
                $thumbnail = $imageLinks['thumbnail'] ?? $imageLinks['smallThumbnail'] ?? null;

                if ($thumbnail) {
                    $thumbnail = str_replace('http://', 'https://', $thumbnail);

                    return ['thumbnail' => $thumbnail];
                }
            } catch (\Exception) {
                continue;
            }
        }

        return null;
    }

    /**
     * Clean ISBN by removing non-numeric characters and equals/quotes.
     *
     * Returns empty string for scientific notation (precision is lost).
     */
    private function cleanIsbn(?string $isbn): string
    {
        if ($isbn === null) {
            return '';
        }

        $isbn = trim($isbn, " \t\n\r\0\x0B=\"'");

        if (preg_match('/[eE][+\-]?\d+/', $isbn)) {
            return '';
        }

        $cleaned = preg_replace('/[^0-9X]/', '', $isbn) ?? '';

        if (strlen($cleaned) === 10 || strlen($cleaned) === 13) {
            return $cleaned;
        }

        return '';
    }

    /**
     * Parse integer value.
     */
    private function parseInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $int = (int) $value;

        return $int > 0 ? $int : null;
    }

    /**
     * Parse float value.
     */
    private function parseFloat(mixed $value): ?float
    {
        if ($value === null || $value === '' || $value === '0') {
            return null;
        }

        $float = (float) $value;

        return $float > 0 ? round($float, 2) : null;
    }

    /**
     * Normalize published date from Goodreads columns.
     *
     * Handles both Goodreads export and Kaggle formats.
     */
    private function normalizePublishedDate(array $sourceBook): ?string
    {
        $year = $sourceBook['Year Published'] ?? $sourceBook['Original Publication Year'] ?? null;

        if (! empty($year) && is_numeric($year)) {
            $year = (int) $year;
            if ($year >= 1000 && $year <= 2100) {
                return "{$year}-01-01";
            }
        }

        $dateStr = $sourceBook['firstPublishDate'] ?? $sourceBook['publishDate'] ?? null;
        if (! empty($dateStr)) {
            try {
                return Carbon::parse($dateStr)->format('Y-m-d');
            } catch (\Exception) {
            }
        }

        return null;
    }

    /**
     * Parse Goodreads date format (YYYY/MM/DD).
     */
    private function parseGoodreadsDate(?string $date): ?string
    {
        if (empty($date)) {
            return null;
        }

        try {
            return Carbon::createFromFormat('Y/m/d', $date)->format('Y-m-d');
        } catch (\Exception) {
            try {
                return Carbon::parse($date)->format('Y-m-d');
            } catch (\Exception) {
                return null;
            }
        }
    }

    /**
     * Map Goodreads shelf to status.
     */
    private function mapStatus(?string $shelf): string
    {
        return match (strtolower($shelf ?? '')) {
            'to-read' => BookStatusEnum::WantToRead->value,
            'currently-reading' => BookStatusEnum::Reading->value,
            'read' => BookStatusEnum::Read->value,
            default => BookStatusEnum::WantToRead->value,
        };
    }

    /**
     * Parse series info from Kaggle format.
     *
     * Handles formats like "The Hunger Games #1" or "Harry Potter #5".
     *
     * @return array{name: string, number: string}
     */
    private function parseSeriesInfo(array $sourceBook): array
    {
        $series = trim($sourceBook['series'] ?? '');

        if (empty($series)) {
            return ['name' => '', 'number' => ''];
        }

        if (preg_match('/^(.+?)\s*#(\d+(?:\.\d+)?)\s*$/', $series, $matches)) {
            return [
                'name' => trim($matches[1]),
                'number' => $matches[2],
            ];
        }

        return ['name' => $series, 'number' => ''];
    }

    /**
     * Parse genres from Kaggle format.
     *
     * Handles Python list strings like "['Young Adult', 'Fiction']".
     */
    private function parseGenres(array $sourceBook): string
    {
        $genres = $sourceBook['genres'] ?? $sourceBook['Bookshelves'] ?? '';

        if (empty($genres)) {
            return '';
        }

        if (str_starts_with($genres, '[') && str_ends_with($genres, ']')) {
            $genres = trim($genres, '[]');
            $genres = preg_replace("/[\"']/", '', $genres);
        }

        $genreList = array_map('trim', explode(',', $genres));
        $genreList = array_filter($genreList);
        $genreList = array_slice($genreList, 0, 5);

        return implode(', ', $genreList);
    }

    /**
     * Clean author name.
     *
     * Removes illustrator credits and other parenthetical notes.
     */
    private function cleanAuthor(string $author): string
    {
        $author = preg_replace('/\s*\([^)]*\)\s*$/', '', $author);

        if (str_contains($author, ',')) {
            $parts = explode(',', $author);
            $author = trim($parts[0]);
        }

        return $author;
    }
}
