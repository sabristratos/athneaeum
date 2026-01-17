<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Contracts\Metadata\MetadataAggregatorInterface;
use App\DTOs\Metadata\MetadataQueryDTO;
use App\Services\Ingestion\LLM\LLMConsultant;
use App\Services\SeedData\SeedDataService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use League\Csv\Reader;

/**
 * Builds seed data for NYT bestseller books.
 *
 * Reads books from the NYT CSV export, enriches them with:
 * - Metadata from Open Library (primary) + Google Books (fallback)
 * - Cover images from Open Library Covers API
 * - Classification (audience, intensity, moods, vibes) from Gemini
 *
 * Downloads covers and saves clean data for seeding.
 */
class BuildNYTSeedDataCommand extends Command
{
    protected $signature = 'seed-data:build-nyt
                            {--source=NYT/nyt_library_export.csv : Source CSV file path}
                            {--limit=10 : Maximum number of books to process}
                            {--skip=0 : Number of rows to skip from source}
                            {--no-covers : Skip downloading cover images}
                            {--no-classify : Skip LLM classification}
                            {--force : Reprocess already-processed books}
                            {--dry-run : Show what would be processed without saving}';

    protected $description = 'Build NYT bestseller seed data with covers and LLM classification';

    private const CATALOG_HEADERS = [
        'isbn13',
        'title',
        'author',
        'description',
        'page_count',
        'published_date',
        'publisher',
        'cover_url',
        'cover_filename',
        'genres',
        'series_name',
        'volume_number',
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
        'is_nyt_bestseller',
        'nyt_list_category',
        'nyt_weeks_on_list',
        'nyt_peak_rank',
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
        $sourcePath = base_path($this->option('source'));
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

        $alreadyProcessed = $this->seedData->getProcessedCount('catalog');

        $this->info("Processing NYT books from: {$sourcePath}");
        $this->info("Already processed: {$alreadyProcessed} catalog books");
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

            if (! $force && $this->seedData->isProcessed('catalog', $identifier)) {
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
                    $saved = $this->seedData->saveBookToCsv('catalog', $processed, self::CATALOG_HEADERS, 'isbn13');

                    if ($saved) {
                        $this->seedData->markProcessed('catalog', $identifier, [
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

        $totalBooks = $this->seedData->getProcessedCount('catalog');
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
     */
    private function getBookIdentifier(array $sourceBook): string
    {
        $isbn = $sourceBook['isbn13'] ?? '';
        if (! empty($isbn)) {
            return 'nyt-'.$isbn;
        }

        $title = $sourceBook['title'] ?? 'unknown';
        $author = $sourceBook['author'] ?? '';

        return 'nyt-'.Str::slug($title.'-'.$author);
    }

    /**
     * Read the source NYT CSV.
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

            if (! empty($record['title'])) {
                $identifier = $this->getBookIdentifier($record);

                if ($force || ! $this->seedData->isProcessed('catalog', $identifier)) {
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
     * @return array<string, mixed>|null
     */
    private function processBook(
        array $sourceBook,
        bool $downloadCovers,
        bool $classify,
        bool $dryRun,
        int &$coverSkippedCount = 0,
    ): ?array {
        $title = trim($sourceBook['title'] ?? '');
        $author = trim($sourceBook['author'] ?? '');
        $isbn13 = preg_replace('/[^0-9]/', '', $sourceBook['isbn13'] ?? '');

        if (empty($title)) {
            return null;
        }

        $nytCoverUrl = trim($sourceBook['cover_url'] ?? '');

        $book = [
            'isbn13' => $isbn13,
            'title' => $title,
            'author' => $author,
            'description' => trim($sourceBook['description'] ?? ''),
            'page_count' => null,
            'published_date' => null,
            'publisher' => trim($sourceBook['publisher'] ?? ''),
            'cover_url' => $nytCoverUrl,
            'cover_filename' => '',
            'genres' => $this->inferGenresFromNYTCategory($sourceBook['nyt_list_category'] ?? ''),
            'series_name' => '',
            'volume_number' => '',
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
            'is_nyt_bestseller' => 1,
            'nyt_list_category' => trim($sourceBook['nyt_list_category'] ?? ''),
            'nyt_weeks_on_list' => (int) ($sourceBook['weeks_on_list'] ?? 0) ?: null,
            'nyt_peak_rank' => (int) ($sourceBook['rank'] ?? 0) ?: null,
            'nyt_cover_url' => $nytCoverUrl,
        ];

        $enrichment = $this->enrichBook($isbn13, $title, $author);

        if ($enrichment) {
            if (! empty($enrichment['cover_url'])) {
                $book['cover_url'] = $enrichment['cover_url'];
            }

            if (empty($book['description']) && ! empty($enrichment['description'])) {
                $book['description'] = $enrichment['description'];
            }

            if (empty($book['description']) && ! empty($enrichment['ol_description'])) {
                $book['description'] = $enrichment['ol_description'];
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

        if ($downloadCovers && ! $dryRun && ! empty($book['isbn13'])) {
            $identifier = $book['isbn13'] ?: Str::slug($book['title']);

            $existingCover = $this->seedData->coverExists('catalog', $identifier);
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
        $identifier = $book['isbn13'] ?: Str::slug($book['title']);
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

                $filename = $this->seedData->downloadMedia('catalog', $url, $identifier);

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
     * 1. NYT CSV cover_url (already validated, direct from NYT)
     * 2. Enriched cover_url (aggregator already validated this works)
     * 3. Enriched cover_url_fallback
     * 4. Cover ID from Open Library
     * 5. Google Books thumbnail
     * 6. OLID-based lookup
     * 7. ISBN-based lookups (last resort, use ?default=false)
     *
     * @return array<string, string|null>
     */
    private function buildCoverWaterfall(array $book): array
    {
        $urls = [];

        if (! empty($book['nyt_cover_url'])) {
            $urls['nyt_direct'] = $book['nyt_cover_url'];
        }

        if (! empty($book['cover_url']) && $book['cover_url'] !== ($book['nyt_cover_url'] ?? '')) {
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

        $isbn10 = $book['isbn10'] ?? null;
        if (empty($isbn10) && ! empty($book['isbn13']) && strlen($book['isbn13']) === 13) {
            $isbn10 = $this->isbn13ToIsbn10($book['isbn13']);
        }

        if (! empty($isbn10)) {
            $urls['ol_isbn10_L'] = "https://covers.openlibrary.org/b/isbn/{$isbn10}-L.jpg?default=false";
        }

        return $urls;
    }

    /**
     * Convert ISBN-13 to ISBN-10 for additional cover lookup.
     */
    private function isbn13ToIsbn10(string $isbn13): ?string
    {
        if (! str_starts_with($isbn13, '978')) {
            return null;
        }

        $isbn10Base = substr($isbn13, 3, 9);

        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += (int) $isbn10Base[$i] * (10 - $i);
        }

        $checkDigit = (11 - ($sum % 11)) % 11;
        $checkChar = $checkDigit === 10 ? 'X' : (string) $checkDigit;

        return $isbn10Base.$checkChar;
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
                if (! empty($openLibraryData['description'])) {
                    $data['ol_description'] = $openLibraryData['description'];
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
     * Fetch Open Library edition data for OLID, cover_id, and description.
     *
     * Fetches edition first, then work for description if needed.
     *
     * @return array{olid: ?string, cover_id: ?int, description: ?string}|null
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

            $description = $this->extractDescription($data);

            if (empty($description) && ! empty($data['works'][0]['key'])) {
                $workKey = $data['works'][0]['key'];
                $workDescription = $this->fetchOpenLibraryWorkDescription($workKey);
                if ($workDescription) {
                    $description = $workDescription;
                }
            }

            return [
                'olid' => $olid,
                'cover_id' => $coverId,
                'description' => $description,
            ];
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Fetch description from Open Library work.
     */
    private function fetchOpenLibraryWorkDescription(string $workKey): ?string
    {
        try {
            $response = Http::timeout(10)
                ->get("https://openlibrary.org{$workKey}.json");

            if (! $response->successful()) {
                return null;
            }

            return $this->extractDescription($response->json());
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Extract description from Open Library data.
     *
     * Handles both string and object formats.
     */
    private function extractDescription(array $data): ?string
    {
        $description = $data['description'] ?? null;

        if (empty($description)) {
            return null;
        }

        if (is_string($description)) {
            return trim($description);
        }

        if (is_array($description) && ! empty($description['value'])) {
            return trim($description['value']);
        }

        return null;
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
     * Infer genres from NYT list category.
     */
    private function inferGenresFromNYTCategory(string $category): string
    {
        $category = strtolower($category);

        if (str_contains($category, 'fiction')) {
            return 'Fiction';
        }

        if (str_contains($category, 'nonfiction')) {
            return 'Non-Fiction';
        }

        return '';
    }
}
