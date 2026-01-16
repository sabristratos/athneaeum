<?php

declare(strict_types=1);

namespace App\Contracts\Discovery;

/**
 * Contract for ingesting book data into the discovery catalog.
 *
 * Implementations handle parsing external data sources (CSV, JSON, APIs)
 * and persisting sanitized data to the catalog_books table.
 */
interface CatalogIngestionServiceInterface
{
    /**
     * Ingest books from a CSV file into the catalog.
     *
     * @param  string  $filePath  Path to the CSV file
     * @param  int  $chunkSize  Number of records to process per batch
     * @return array{processed: int, skipped: int, errors: array<string>}
     *
     * @throws \RuntimeException If the file cannot be read
     */
    public function ingestFromCsv(string $filePath, int $chunkSize = 500): array;

    /**
     * Compute the popularity score for a book.
     *
     * Formula: rating * log(review_count + 1)
     *
     * @param  int  $reviewCount  Number of reviews
     * @param  float  $averageRating  Average rating (1-5)
     * @return float  The computed popularity score
     */
    public function computePopularityScore(int $reviewCount, float $averageRating): float;

    /**
     * Get the total count of books in the catalog.
     */
    public function getCatalogCount(): int;

    /**
     * Get the count of books pending embedding generation.
     */
    public function getPendingEmbeddingCount(): int;
}
