<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Contract for book search service providers.
 *
 * Implementations should handle searching external book APIs
 * and transforming results to a consistent format.
 */
interface BookSearchServiceInterface
{
    /**
     * Search for books by query string with optional pagination and filters.
     *
     * @return array{
     *   items: array<int, array{
     *     external_id: ?string,
     *     title: string,
     *     author: string,
     *     cover_url: ?string,
     *     page_count: ?int,
     *     isbn: ?string,
     *     description: ?string,
     *     genres: array<string>,
     *     published_date: ?string,
     *     average_rating: ?float,
     *     ratings_count: ?int
     *   }>,
     *   totalItems: int,
     *   startIndex: int,
     *   hasMore: bool
     * }
     */
    public function search(
        string $query,
        int $limit = 20,
        int $startIndex = 0,
        ?string $langRestrict = null,
        ?array $genres = null,
        ?float $minRating = null,
        ?int $yearFrom = null,
        ?int $yearTo = null
    ): array;

    /**
     * Find a single book by its external ID.
     *
     * @return array{
     *   external_id: ?string,
     *   title: string,
     *   author: string,
     *   cover_url: ?string,
     *   page_count: ?int,
     *   isbn: ?string,
     *   description: ?string,
     *   genres: array<string>,
     *   published_date: ?string
     * }|null
     */
    public function findByExternalId(string $externalId): ?array;

    /**
     * Search for all editions of a book by title and author.
     *
     * Returns ungrouped results so users can pick a specific edition.
     *
     * @return array<int, array{
     *   external_id: ?string,
     *   title: string,
     *   author: string,
     *   cover_url: ?string,
     *   page_count: ?int,
     *   isbn: ?string,
     *   description: ?string,
     *   genres: array<string>,
     *   published_date: ?string,
     *   average_rating: ?float,
     *   ratings_count: ?int
     * }>
     */
    public function searchEditions(string $title, string $author, int $limit = 20): array;

    /**
     * Get the provider name identifier.
     *
     * Used for storing which provider a book came from.
     * Examples: 'google_books', 'open_library'
     */
    public function getProviderName(): string;
}
