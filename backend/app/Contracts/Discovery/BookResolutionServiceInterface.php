<?php

declare(strict_types=1);

namespace App\Contracts\Discovery;

use App\Models\MasterBook;
use Illuminate\Support\Collection;

/**
 * Service for resolving books with minimal external API calls.
 *
 * Checks local database first before hitting external APIs,
 * building a proprietary book database over time.
 */
interface BookResolutionServiceInterface
{
    /**
     * Resolve a book from search result data, using local cache first.
     *
     * @param  array  $searchResult  Book data from search (title, author, isbn, etc.)
     * @return MasterBook Existing or newly created master book
     */
    public function resolve(array $searchResult): MasterBook;

    /**
     * Find an existing book by various identifiers.
     *
     * Resolution priority:
     * 1. ISBN-13 exact match
     * 2. ISBN-10 exact match
     * 3. Google Books ID exact match
     * 4. Open Library key exact match
     * 5. Title + Author fuzzy match (85%+ similarity)
     */
    public function findExisting(
        ?string $isbn13 = null,
        ?string $isbn10 = null,
        ?string $googleBooksId = null,
        ?string $openLibraryKey = null,
        ?string $title = null,
        ?string $author = null
    ): ?MasterBook;

    /**
     * Check if a search query can be satisfied locally.
     *
     * Returns true if we have enough local coverage (10+ books matching).
     */
    public function canResolveLocally(string $query): bool;

    /**
     * Search the master_books table directly.
     *
     * @param  string  $query  Search query (title or author)
     * @param  int  $limit  Maximum results to return
     * @return Collection<MasterBook>
     */
    public function searchLocal(string $query, int $limit = 20): Collection;

    /**
     * Create a new master book from search result data.
     *
     * @param  array  $data  Book data to store
     * @param  bool  $queueEnrichment  Whether to queue enrichment job
     */
    public function create(array $data, bool $queueEnrichment = true): MasterBook;

    /**
     * Increment user count for a book (when user adds to library).
     */
    public function incrementUserCount(MasterBook $book): void;

    /**
     * Get statistics about local book coverage.
     *
     * @return array{total: int, with_covers: int, with_embeddings: int, classified: int}
     */
    public function getCoverageStats(): array;
}
