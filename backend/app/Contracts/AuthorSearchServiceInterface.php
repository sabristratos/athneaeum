<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Contract for author search service providers.
 *
 * Implementations should handle searching external author APIs
 * and transforming results to a consistent format.
 */
interface AuthorSearchServiceInterface
{
    /**
     * Search for authors by name.
     *
     * @return array{
     *   items: array<int, array{
     *     key: string,
     *     name: string,
     *     alternate_names: array<string>,
     *     birth_date: ?string,
     *     death_date: ?string,
     *     top_work: ?string,
     *     work_count: int,
     *     top_subjects: array<string>
     *   }>,
     *   totalItems: int,
     *   hasMore: bool
     * }
     */
    public function searchAuthors(string $query, int $limit = 20, int $offset = 0): array;

    /**
     * Get detailed author information by key.
     *
     * @return array{
     *   key: string,
     *   name: string,
     *   alternate_names: array<string>,
     *   birth_date: ?string,
     *   death_date: ?string,
     *   bio: ?string,
     *   photo_url: ?string,
     *   wikipedia_url: ?string,
     *   links: array<array{title: string, url: string}>
     * }|null
     */
    public function getAuthor(string $authorKey): ?array;

    /**
     * Get works by an author.
     *
     * @return array{
     *   items: array<int, array{
     *     key: string,
     *     title: string,
     *     first_publish_year: ?int,
     *     edition_count: int,
     *     cover_id: ?int,
     *     subjects: array<string>
     *   }>,
     *   totalItems: int,
     *   hasMore: bool
     * }
     */
    public function getAuthorWorks(string $authorKey, int $limit = 20, int $offset = 0): array;

    /**
     * Get the provider name identifier.
     */
    public function getProviderName(): string;
}
