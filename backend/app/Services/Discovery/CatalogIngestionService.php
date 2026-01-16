<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use App\Contracts\AuthorResolverInterface;
use App\Contracts\Discovery\CatalogIngestionServiceInterface;
use App\DTOs\Discovery\CatalogBookDTO;
use App\Models\CatalogBook;
use App\Services\Catalog\CatalogGenreService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use League\Csv\Reader;

/**
 * Service for ingesting book data into the discovery catalog.
 *
 * Handles CSV parsing, data sanitization, and batch insertion
 * with deduplication based on external IDs.
 */
class CatalogIngestionService implements CatalogIngestionServiceInterface
{
    public function __construct(
        private readonly AuthorResolverInterface $authorResolver,
        private readonly CatalogGenreService $genreService,
    ) {}

    /**
     * Ingest books from a CSV file into the catalog.
     *
     * @throws \RuntimeException If the file cannot be read
     */
    public function ingestFromCsv(string $filePath, int $chunkSize = 500): array
    {
        if (! file_exists($filePath)) {
            throw new \RuntimeException("CSV file not found: {$filePath}");
        }

        $results = [
            'processed' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        try {
            $reader = Reader::createFromPath($filePath, 'r');
            $reader->setHeaderOffset(0);

            $batch = [];
            $processedExternalIds = [];

            foreach ($reader->getRecords() as $index => $record) {
                try {
                    $dto = CatalogBookDTO::fromKaggleRow($record);

                    if (! $dto->isValid()) {
                        $results['skipped']++;

                        continue;
                    }

                    if ($dto->externalId && in_array($dto->externalId, $processedExternalIds, true)) {
                        $results['skipped']++;

                        continue;
                    }

                    if ($dto->externalId && CatalogBook::where('external_id', $dto->externalId)->exists()) {
                        $results['skipped']++;

                        continue;
                    }

                    $bookData = $dto->toArray();
                    $bookData['popularity_score'] = $this->computePopularityScore(
                        $dto->reviewCount ?? 0,
                        $dto->averageRating ?? 0.0
                    );
                    $bookData['created_at'] = now();
                    $bookData['updated_at'] = now();

                    $batch[] = $bookData;

                    if ($dto->externalId) {
                        $processedExternalIds[] = $dto->externalId;
                    }

                    if (count($batch) >= $chunkSize) {
                        $this->insertBatch($batch);
                        $results['processed'] += count($batch);
                        $batch = [];

                        Log::info('[CatalogIngestion] Batch processed', [
                            'total_processed' => $results['processed'],
                        ]);
                    }
                } catch (\Exception $e) {
                    if (count($results['errors']) < 10) {
                        $results['errors'][] = "Row {$index}: {$e->getMessage()}";
                    }
                }
            }

            if (! empty($batch)) {
                $this->insertBatch($batch);
                $results['processed'] += count($batch);
            }

            Log::info('[CatalogIngestion] Ingestion complete', $results);
        } catch (\Exception $e) {
            Log::error('[CatalogIngestion] Failed to ingest CSV', [
                'file' => $filePath,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $results;
    }

    /**
     * Compute the popularity score for a book.
     *
     * Formula: rating * log(review_count + 1)
     */
    public function computePopularityScore(int $reviewCount, float $averageRating): float
    {
        if ($averageRating <= 0) {
            return 0.0;
        }

        return $averageRating * log($reviewCount + 1);
    }

    /**
     * Get the total count of books in the catalog.
     */
    public function getCatalogCount(): int
    {
        return CatalogBook::count();
    }

    /**
     * Get the count of books pending embedding generation.
     */
    public function getPendingEmbeddingCount(): int
    {
        return CatalogBook::where('is_embedded', false)->count();
    }

    /**
     * Insert a batch of books with conflict handling.
     */
    private function insertBatch(array $batch): void
    {
        DB::transaction(function () use ($batch) {
            foreach ($batch as $bookData) {
                $genres = $bookData['genres'];
                $characters = $bookData['characters'];
                unset($bookData['genres'], $bookData['characters']);

                $bookData['genres'] = $genres ? json_encode($genres) : null;
                $bookData['characters'] = $characters ? json_encode($characters) : null;

                DB::table('catalog_books')->insert($bookData);
            }
        });
    }

    /**
     * Process author relationships for books without linked authors.
     *
     * This can be run separately after batch ingestion to link
     * authors without slowing down the initial import.
     */
    public function processAuthorRelationships(int $batchSize = 100, ?int $limit = null): array
    {
        $results = [
            'processed' => 0,
            'linked' => 0,
            'errors' => 0,
        ];

        $query = CatalogBook::whereDoesntHave('authors')
            ->whereNotNull('author')
            ->where('author', '!=', '');

        if ($limit) {
            $query->limit($limit);
        }

        $query->chunk($batchSize, function ($books) use (&$results) {
            foreach ($books as $book) {
                try {
                    $authors = $this->authorResolver->resolveWithEnrichment($book->author);

                    if ($authors->isNotEmpty()) {
                        $syncData = $authors->mapWithKeys(fn ($author, $index) => [
                            $author->id => ['position' => $index + 1],
                        ])->all();

                        $book->authors()->sync($syncData);
                        $results['linked'] += $authors->count();
                    }

                    $results['processed']++;
                } catch (\Exception $e) {
                    $results['errors']++;
                    Log::warning('[CatalogIngestion] Failed to process author', [
                        'book_id' => $book->id,
                        'author' => $book->author,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info('[CatalogIngestion] Author batch processed', $results);
        });

        return $results;
    }

    /**
     * Process genre relationships for books without linked genres.
     */
    public function processGenreRelationships(int $batchSize = 100, ?int $limit = null): array
    {
        $results = [
            'processed' => 0,
            'linked' => 0,
            'unmapped' => 0,
            'errors' => 0,
        ];

        $query = CatalogBook::whereDoesntHave('genres')
            ->whereNotNull('genres');

        if ($limit) {
            $query->limit($limit);
        }

        $query->chunk($batchSize, function ($books) use (&$results) {
            foreach ($books as $book) {
                try {
                    $rawGenres = $book->genres;

                    if (empty($rawGenres) || ! is_array($rawGenres)) {
                        $results['processed']++;

                        continue;
                    }

                    $genres = $this->genreService->mapGenres($rawGenres);

                    if ($genres->isNotEmpty()) {
                        $syncData = $genres->mapWithKeys(fn ($genre, $index) => [
                            $genre->id => ['is_primary' => $index === 0],
                        ])->all();

                        $book->genres()->sync($syncData);
                        $results['linked'] += $genres->count();
                    } else {
                        $results['unmapped']++;
                    }

                    $results['processed']++;
                } catch (\Exception $e) {
                    $results['errors']++;
                    Log::warning('[CatalogIngestion] Failed to process genres', [
                        'book_id' => $book->id,
                        'genres' => $book->genres,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info('[CatalogIngestion] Genre batch processed', $results);
        });

        return $results;
    }

    /**
     * Process both author and genre relationships.
     */
    public function processAllRelationships(int $batchSize = 100, ?int $limit = null): array
    {
        return [
            'authors' => $this->processAuthorRelationships($batchSize, $limit),
            'genres' => $this->processGenreRelationships($batchSize, $limit),
        ];
    }
}
