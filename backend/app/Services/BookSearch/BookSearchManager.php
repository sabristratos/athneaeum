<?php

declare(strict_types=1);

namespace App\Services\BookSearch;

use App\Contracts\Discovery\BookResolutionServiceInterface;
use App\Enums\PreferenceCategoryEnum;
use App\Enums\PreferenceTypeEnum;
use App\Enums\SearchSourceEnum;
use App\Jobs\StoreMasterBookJob;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Manages book search across multiple providers based on user preference.
 *
 * Now includes local search from master_books table to reduce API calls
 * and build a proprietary book database over time.
 */
class BookSearchManager
{
    private const MIN_LOCAL_COVERAGE = 10;

    public function __construct(
        private GoogleBooksService $googleBooks,
        private BookResolutionServiceInterface $bookResolution
    ) {}

    /**
     * Get user's excluded preferences for filtering search results.
     *
     * @return array{authors: array<string>, genres: array<string>}
     */
    private function getUserExcludes(User $user): array
    {
        $excludes = $user->userPreferences()
            ->where('type', PreferenceTypeEnum::Exclude)
            ->get();

        return [
            'authors' => $excludes
                ->where('category', PreferenceCategoryEnum::Author)
                ->pluck('normalized')
                ->toArray(),
            'genres' => $excludes
                ->where('category', PreferenceCategoryEnum::Genre)
                ->pluck('normalized')
                ->toArray(),
        ];
    }

    /**
     * Filter results based on user's excluded preferences.
     *
     * @param  array<array<string, mixed>>  $items
     * @param  array{authors: array<string>, genres: array<string>}  $excludes
     * @return array<array<string, mixed>>
     */
    private function applyExcludeFilters(array $items, array $excludes): array
    {
        if (empty($excludes['authors']) && empty($excludes['genres'])) {
            return $items;
        }

        return array_values(array_filter($items, function ($item) use ($excludes) {
            if (! empty($excludes['authors'])) {
                $author = strtolower(trim($item['author'] ?? ''));
                foreach ($excludes['authors'] as $excludedAuthor) {
                    if (str_contains($author, $excludedAuthor)) {
                        return false;
                    }
                }
            }

            if (! empty($excludes['genres'])) {
                $genres = array_map('strtolower', $item['genres'] ?? []);
                foreach ($excludes['genres'] as $excludedGenre) {
                    foreach ($genres as $genre) {
                        if (str_contains($genre, $excludedGenre)) {
                            return false;
                        }
                    }
                }
            }

            return true;
        }));
    }

    /**
     * Get the appropriate search service(s) based on user preference.
     *
     * First checks local master_books database for coverage.
     * Falls back to external APIs if local coverage is insufficient.
     * Stores new books from external APIs for future local searches.
     *
     * Automatically applies the user's excluded preferences to filter results.
     */
    public function search(
        User $user,
        string $query,
        int $limit = 20,
        int $startIndex = 0,
        ?string $langRestrict = null,
        ?array $genres = null,
        ?float $minRating = null,
        ?int $yearFrom = null,
        ?int $yearTo = null,
        ?string $sourceOverride = null
    ): array {
        $source = $sourceOverride
            ? SearchSourceEnum::tryFrom($sourceOverride)
            : $user->preferred_search_source;

        $source = $source ?? SearchSourceEnum::Google;
        $excludes = $this->getUserExcludes($user);

        // Try local search first (only for Google source and first page)
        if ($source === SearchSourceEnum::Google && $startIndex === 0) {
            $localResults = $this->searchLocal($query, $limit, $excludes);

            if ($localResults['local_coverage']) {
                Log::debug('[BookSearchManager] Using local results', [
                    'query' => $query,
                    'count' => count($localResults['items']),
                ]);

                return $localResults;
            }
        }

        // Fall back to external APIs
        if ($source === SearchSourceEnum::OPDS && $user->hasOpdsConfigured()) {
            $results = $this->searchOpds($user, $query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        } elseif ($source === SearchSourceEnum::Both && $user->hasOpdsConfigured()) {
            $results = $this->searchBoth($user, $query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        } else {
            $results = $this->searchGoogle($query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        }

        $results['items'] = $this->applyExcludeFilters($results['items'], $excludes);

        // Store external results to master_books for future local searches (async)
        if (! empty($results['items']) && $results['provider'] === 'google_books') {
            $this->storeSearchResults($results['items']);
        }

        return $results;
    }

    /**
     * Search local master_books database.
     *
     * @param  array{authors: array<string>, genres: array<string>}  $excludes
     */
    private function searchLocal(string $query, int $limit, array $excludes): array
    {
        $books = $this->bookResolution->searchLocal($query, $limit * 2);

        if ($books->count() < self::MIN_LOCAL_COVERAGE) {
            return [
                'items' => [],
                'totalItems' => 0,
                'startIndex' => 0,
                'hasMore' => false,
                'provider' => 'local',
                'local_coverage' => false,
            ];
        }

        // Transform to search result format
        $items = $books->map(fn ($book) => $this->masterBookToSearchResult($book))->toArray();

        // Apply exclude filters
        $items = $this->applyExcludeFilters($items, $excludes);

        return [
            'items' => array_slice($items, 0, $limit),
            'totalItems' => count($items),
            'startIndex' => 0,
            'hasMore' => count($items) > $limit,
            'provider' => 'local',
            'local_coverage' => true,
        ];
    }

    /**
     * Transform a MasterBook to search result format.
     */
    private function masterBookToSearchResult(\App\Models\MasterBook $book): array
    {
        return [
            'external_id' => $book->google_books_id ?? 'master_'.$book->id,
            'external_provider' => $book->google_books_id ? 'google_books' : 'master_books',
            'master_book_id' => $book->id,
            'title' => $book->title,
            'author' => $book->author,
            'cover_url' => $book->getCoverUrl(),
            'page_count' => $book->page_count,
            'isbn' => $book->isbn13 ?? $book->isbn10,
            'isbn13' => $book->isbn13,
            'description' => $book->description,
            'genres' => $book->genres ?? [],
            'published_date' => $book->published_date?->format('Y-m-d'),
            'average_rating' => $book->average_rating,
            'ratings_count' => $book->review_count,
            'series_name' => $book->series_name,
            'volume_number' => $book->series_position,
            '_source' => 'local',
        ];
    }

    /**
     * Store search results to master_books asynchronously.
     *
     * @param  array<array<string, mixed>>  $items
     */
    private function storeSearchResults(array $items): void
    {
        foreach ($items as $item) {
            // Skip if already in master_books (checked by resolution service)
            $exists = $this->bookResolution->findExisting(
                isbn13: $item['isbn13'] ?? $item['isbn'] ?? null,
                googleBooksId: $item['external_id'] ?? null,
                title: $item['title'] ?? null,
                author: $item['author'] ?? null
            );

            if (! $exists) {
                StoreMasterBookJob::dispatch($item)->onQueue('low');
            }
        }
    }

    private function searchGoogle(
        string $query,
        int $limit,
        int $startIndex,
        ?string $langRestrict,
        ?array $genres,
        ?float $minRating,
        ?int $yearFrom,
        ?int $yearTo
    ): array {
        $results = $this->googleBooks->search($query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);

        return [
            'items' => $results['items'],
            'totalItems' => $results['totalItems'],
            'startIndex' => $results['startIndex'],
            'hasMore' => $results['hasMore'],
            'provider' => 'google_books',
        ];
    }

    private function searchOpds(
        User $user,
        string $query,
        int $limit,
        int $startIndex,
        ?string $langRestrict,
        ?array $genres,
        ?float $minRating,
        ?int $yearFrom,
        ?int $yearTo
    ): array {
        $opdsService = $this->createOpdsService($user);

        $results = $opdsService->search($query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);

        return [
            'items' => $results['items'],
            'totalItems' => $results['totalItems'],
            'startIndex' => $results['startIndex'],
            'hasMore' => $results['hasMore'],
            'provider' => 'opds',
        ];
    }

    private function searchBoth(
        User $user,
        string $query,
        int $limit,
        int $startIndex,
        ?string $langRestrict,
        ?array $genres,
        ?float $minRating,
        ?int $yearFrom,
        ?int $yearTo
    ): array {
        $halfLimit = (int) ceil($limit / 2);

        $googleResults = $this->googleBooks->search($query, $halfLimit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);

        $opdsService = $this->createOpdsService($user);
        $opdsResults = $opdsService->search($query, $halfLimit, 0, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);

        $combined = $this->mergeResults($googleResults['items'], $opdsResults['items'], $limit);

        return [
            'items' => $combined,
            'totalItems' => $googleResults['totalItems'] + $opdsResults['totalItems'],
            'startIndex' => $startIndex,
            'hasMore' => $googleResults['hasMore'] || $opdsResults['hasMore'],
            'provider' => 'both',
        ];
    }

    private function mergeResults(array $googleItems, array $opdsItems, int $limit): array
    {
        $merged = [];
        $seenTitles = [];

        foreach ($opdsItems as $item) {
            $key = strtolower(trim($item['title'] ?? ''));
            if (! empty($key) && ! isset($seenTitles[$key])) {
                $item['_source'] = 'opds';
                $merged[] = $item;
                $seenTitles[$key] = true;
            }
        }

        foreach ($googleItems as $item) {
            $key = strtolower(trim($item['title'] ?? ''));
            if (! empty($key) && ! isset($seenTitles[$key])) {
                $item['_source'] = 'google_books';
                $merged[] = $item;
                $seenTitles[$key] = true;
            }
        }

        return array_slice($merged, 0, $limit);
    }

    private function createOpdsService(User $user): OPDSService
    {
        return new OPDSService(
            $user->opds_server_url,
            $user->opds_username,
            $user->getOpdsPasswordDecrypted()
        );
    }

    /**
     * Test OPDS connection for a user.
     */
    public function testOpdsConnection(User $user): array
    {
        if (! $user->hasOpdsConfigured()) {
            return [
                'success' => false,
                'message' => 'OPDS server not configured',
            ];
        }

        $opdsService = $this->createOpdsService($user);

        return $opdsService->testConnection();
    }

    /**
     * Find a book by external ID from the appropriate provider.
     */
    public function findByExternalId(User $user, string $externalId, string $provider): ?array
    {
        if ($provider === 'opds' && $user->hasOpdsConfigured()) {
            $opdsService = $this->createOpdsService($user);

            return $opdsService->findByExternalId($externalId);
        }

        return $this->googleBooks->findByExternalId($externalId);
    }
}
