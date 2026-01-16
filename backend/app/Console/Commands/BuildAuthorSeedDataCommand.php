<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Authors\OpenLibraryAuthorService;
use App\Services\SeedData\SeedDataService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Builds seed data for authors by extracting from books and enriching via Open Library API.
 *
 * Extracts unique authors from the books seed data, enriches them with
 * biographical data and photos from Open Library, and saves clean data for seeding.
 */
class BuildAuthorSeedDataCommand extends Command
{
    protected $signature = 'seed-data:build-authors
                            {--limit=100 : Maximum number of NEW authors to process}
                            {--skip=0 : Number of authors to skip}
                            {--no-photos : Skip downloading author photos}
                            {--force : Reprocess already-processed authors}
                            {--dry-run : Show what would be processed without saving}';

    protected $description = 'Build author seed data from books CSV + Open Library API enrichment';

    private const AUTHOR_HEADERS = [
        'name',
        'slug',
        'sort_name',
        'open_library_key',
        'birth_date',
        'death_date',
        'bio',
        'photo_url',
        'photo_filename',
        'top_work',
        'work_count',
        'wikipedia_url',
    ];

    public function __construct(
        private readonly SeedDataService $seedData,
        private readonly OpenLibraryAuthorService $openLibrary
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $limit = (int) $this->option('limit');
        $skip = (int) $this->option('skip');
        $downloadPhotos = ! $this->option('no-photos');
        $force = $this->option('force');
        $dryRun = $this->option('dry-run');

        $alreadyProcessed = $this->seedData->getProcessedCount('authors');

        $this->info('Extracting authors from books seed data...');
        $this->info("Already processed: {$alreadyProcessed} authors");
        $this->info("Limit: {$limit} new authors, Skip: {$skip}");
        $this->info('Download photos: '.($downloadPhotos ? 'yes' : 'no'));

        if ($force) {
            $this->warn('FORCE MODE - Will reprocess already-processed authors');
        }

        if ($dryRun) {
            $this->warn('DRY RUN - No data will be saved');
        }

        $books = $this->seedData->readCsv('books');

        if (empty($books)) {
            $this->error('No books found in seed data. Run seed-data:build-books first.');

            return self::FAILURE;
        }

        $uniqueAuthors = $this->extractUniqueAuthors($books);
        $this->info('Found '.count($uniqueAuthors).' unique authors in books');

        $authorsToProcess = $this->filterUnprocessedAuthors($uniqueAuthors, $skip, $limit, $force);

        if (empty($authorsToProcess)) {
            $this->info('No new authors to process. Use --force to reprocess.');

            return self::SUCCESS;
        }

        $this->info('Processing '.count($authorsToProcess).' authors');

        $existingAuthors = $this->seedData->readCsv('authors');
        $processedAuthors = $existingAuthors;
        $newCount = 0;
        $enrichedCount = 0;
        $photoCount = 0;

        $progressBar = $this->output->createProgressBar(count($authorsToProcess));
        $progressBar->start();

        foreach ($authorsToProcess as $authorName) {
            $slug = Str::slug($authorName);

            $processed = $this->processAuthor($authorName, $downloadPhotos, $dryRun);

            if ($processed) {
                $processedAuthors[] = $processed;
                $newCount++;

                if (! empty($processed['open_library_key'])) {
                    $enrichedCount++;
                }

                if (! empty($processed['photo_filename'])) {
                    $photoCount++;
                }

                if (! $dryRun) {
                    $this->seedData->markProcessed('authors', $slug, [
                        'name' => $authorName,
                        'has_photo' => ! empty($processed['photo_filename']),
                        'has_open_library' => ! empty($processed['open_library_key']),
                    ]);
                }
            }

            $progressBar->advance();

            usleep(500000);
        }

        $progressBar->finish();
        $this->newLine(2);

        if (! $dryRun && $newCount > 0) {
            $savedCount = $this->seedData->writeCsv('authors', $processedAuthors, self::AUTHOR_HEADERS);
            $this->info("Saved {$savedCount} authors to seed data (total)");
        }

        $this->table(
            ['Metric', 'Count'],
            [
                ['New authors processed', $newCount],
                ['Authors enriched (Open Library)', $enrichedCount],
                ['Photos downloaded', $photoCount],
                ['Total authors in seed data', count($processedAuthors)],
            ]
        );

        return self::SUCCESS;
    }

    /**
     * Filter authors list to only include unprocessed ones.
     *
     * @param  array<string>  $authors
     * @return array<string>
     */
    private function filterUnprocessedAuthors(array $authors, int $skip, int $limit, bool $force): array
    {
        $filtered = [];
        $skipped = 0;

        foreach ($authors as $authorName) {
            if ($skipped < $skip) {
                $skipped++;

                continue;
            }

            if (count($filtered) >= $limit) {
                break;
            }

            $slug = Str::slug($authorName);

            if ($force || ! $this->seedData->isProcessed('authors', $slug)) {
                $filtered[] = $authorName;
            }
        }

        return $filtered;
    }

    /**
     * Extract unique author names from books.
     *
     * @param  array<int, array<string, string>>  $books
     * @return array<string>
     */
    private function extractUniqueAuthors(array $books): array
    {
        $authors = [];

        foreach ($books as $book) {
            $authorStr = $book['author'] ?? '';

            if (empty($authorStr)) {
                continue;
            }

            $bookAuthors = preg_split('/\s*,\s*(?=[A-Z])/', $authorStr);

            foreach ($bookAuthors as $author) {
                $author = trim($author);
                $normalized = Str::slug($author);

                if (! empty($author) && ! isset($authors[$normalized])) {
                    $authors[$normalized] = $author;
                }
            }
        }

        return array_values($authors);
    }

    /**
     * Process a single author.
     *
     * @return array<string, mixed>|null
     */
    private function processAuthor(string $authorName, bool $downloadPhotos, bool $dryRun): ?array
    {
        $slug = Str::slug($authorName);

        $author = [
            'name' => $authorName,
            'slug' => $slug,
            'sort_name' => $this->generateSortName($authorName),
            'open_library_key' => '',
            'birth_date' => '',
            'death_date' => '',
            'bio' => '',
            'photo_url' => '',
            'photo_filename' => '',
            'top_work' => '',
            'work_count' => '',
            'wikipedia_url' => '',
        ];

        $enrichment = $this->enrichFromOpenLibrary($authorName);

        if ($enrichment) {
            if (! empty($enrichment['key'])) {
                $author['open_library_key'] = $enrichment['key'];
            }

            $metadata = $enrichment['metadata'] ?? [];

            if (! empty($metadata['birth_date'])) {
                $author['birth_date'] = $metadata['birth_date'];
            }

            if (! empty($metadata['death_date'])) {
                $author['death_date'] = $metadata['death_date'];
            }

            if (! empty($metadata['bio'])) {
                $author['bio'] = $this->cleanBio($metadata['bio']);
            }

            if (! empty($metadata['photo_url'])) {
                $author['photo_url'] = $metadata['photo_url'];
            }

            if (! empty($metadata['top_work'])) {
                $author['top_work'] = $metadata['top_work'];
            }

            if (! empty($metadata['work_count'])) {
                $author['work_count'] = $metadata['work_count'];
            }

            if (! empty($metadata['wikipedia_url'])) {
                $author['wikipedia_url'] = $metadata['wikipedia_url'];
            }
        }

        if ($downloadPhotos && ! $dryRun && ! empty($author['photo_url'])) {
            $identifier = $author['open_library_key'] ?: $slug;
            $filename = $this->seedData->downloadMedia('authors', $author['photo_url'], $identifier);

            if ($filename) {
                $author['photo_filename'] = $filename;
            }
        }

        return $author;
    }

    /**
     * Enrich author data from Open Library API.
     *
     * @return array<string, mixed>|null
     */
    private function enrichFromOpenLibrary(string $authorName): ?array
    {
        try {
            return $this->openLibrary->findAndEnrichAuthor($authorName);
        } catch (\Exception $e) {
            $this->warn("Open Library lookup failed for '{$authorName}': {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Generate sort name from author name (Last, First format).
     */
    private function generateSortName(string $name): string
    {
        $name = trim($name);

        if (str_contains($name, ',')) {
            return $name;
        }

        $parts = preg_split('/\s+/', $name);

        if (count($parts) <= 1) {
            return $name;
        }

        $lastName = array_pop($parts);

        return $lastName.', '.implode(' ', $parts);
    }

    /**
     * Clean and truncate author bio.
     */
    private function cleanBio(string $bio): string
    {
        $bio = strip_tags($bio);

        $bio = preg_replace('/\s+/', ' ', $bio);
        $bio = trim($bio);

        if (strlen($bio) > 1000) {
            $bio = substr($bio, 0, 997).'...';
        }

        return $bio;
    }
}
