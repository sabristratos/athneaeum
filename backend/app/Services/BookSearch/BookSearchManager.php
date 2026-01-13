<?php

declare(strict_types=1);

namespace App\Services\BookSearch;

use App\Enums\PreferenceCategoryEnum;
use App\Enums\PreferenceTypeEnum;
use App\Enums\SearchSourceEnum;
use App\Models\User;

/**
 * Manages book search across multiple providers based on user preference.
 */
class BookSearchManager
{
    public function __construct(
        private GoogleBooksService $googleBooks
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

        if ($source === SearchSourceEnum::OPDS && $user->hasOpdsConfigured()) {
            $results = $this->searchOpds($user, $query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        } elseif ($source === SearchSourceEnum::Both && $user->hasOpdsConfigured()) {
            $results = $this->searchBoth($user, $query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        } else {
            $results = $this->searchGoogle($query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        }

        $results['items'] = $this->applyExcludeFilters($results['items'], $excludes);

        return $results;
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
