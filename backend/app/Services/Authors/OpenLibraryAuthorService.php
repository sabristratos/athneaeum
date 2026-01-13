<?php

declare(strict_types=1);

namespace App\Services\Authors;

use App\Contracts\AuthorSearchServiceInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * OpenLibrary API implementation of the author search service.
 *
 * Uses the OpenLibrary Authors API which is free and requires no API key.
 * Includes caching and rate limiting to be a good API citizen.
 */
class OpenLibraryAuthorService implements AuthorSearchServiceInterface
{
    private const BASE_URL = 'https://openlibrary.org';

    private const CACHE_TTL_MINUTES = 60;

    private const TIMEOUT_SECONDS = 10;

    public function searchAuthors(string $query, int $limit = 20, int $offset = 0): array
    {
        $query = trim($query);
        if (strlen($query) < 2) {
            return ['items' => [], 'totalItems' => 0, 'hasMore' => false];
        }

        $cacheKey = $this->buildCacheKey('search', $query, $limit, $offset);

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($query, $limit, $offset) {
            return $this->executeAuthorSearch($query, $limit, $offset);
        });
    }

    public function getAuthor(string $authorKey): ?array
    {
        $authorKey = $this->normalizeAuthorKey($authorKey);
        $cacheKey = "author.detail.{$authorKey}";

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($authorKey) {
            return $this->fetchAuthorDetails($authorKey);
        });
    }

    public function getAuthorWorks(string $authorKey, int $limit = 20, int $offset = 0): array
    {
        $authorKey = $this->normalizeAuthorKey($authorKey);
        $cacheKey = $this->buildCacheKey('works', $authorKey, $limit, $offset);

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($authorKey, $limit, $offset) {
            return $this->fetchAuthorWorks($authorKey, $limit, $offset);
        });
    }

    public function getProviderName(): string
    {
        return 'open_library';
    }

    /**
     * Execute author search against OpenLibrary API.
     */
    private function executeAuthorSearch(string $query, int $limit, int $offset): array
    {
        if (! $this->checkRateLimit()) {
            Log::warning('OpenLibrary rate limit exceeded');

            return ['items' => [], 'totalItems' => 0, 'hasMore' => false];
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->get(self::BASE_URL.'/search/authors.json', [
                    'q' => $query,
                    'limit' => $limit,
                    'offset' => $offset,
                ]);

            if (! $response->successful()) {
                Log::warning('OpenLibrary author search failed', [
                    'status' => $response->status(),
                    'query' => $query,
                ]);

                return ['items' => [], 'totalItems' => 0, 'hasMore' => false];
            }

            $data = $response->json();
            $totalItems = $data['numFound'] ?? 0;
            $docs = $data['docs'] ?? [];

            $items = array_map(fn ($doc) => $this->transformAuthorSearchResult($doc), $docs);

            return [
                'items' => $items,
                'totalItems' => $totalItems,
                'hasMore' => ($offset + count($items)) < $totalItems,
            ];
        } catch (\Exception $e) {
            Log::error('OpenLibrary author search exception', [
                'message' => $e->getMessage(),
                'query' => $query,
            ]);

            return ['items' => [], 'totalItems' => 0, 'hasMore' => false];
        }
    }

    /**
     * Fetch detailed author information.
     */
    private function fetchAuthorDetails(string $authorKey): ?array
    {
        if (! $this->checkRateLimit()) {
            return null;
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->get(self::BASE_URL."/authors/{$authorKey}.json");

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();

            return $this->transformAuthorDetails($data, $authorKey);
        } catch (\Exception $e) {
            Log::error('OpenLibrary author detail exception', [
                'message' => $e->getMessage(),
                'key' => $authorKey,
            ]);

            return null;
        }
    }

    /**
     * Fetch author's works.
     */
    private function fetchAuthorWorks(string $authorKey, int $limit, int $offset): array
    {
        if (! $this->checkRateLimit()) {
            return ['items' => [], 'totalItems' => 0, 'hasMore' => false];
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->get(self::BASE_URL."/authors/{$authorKey}/works.json", [
                    'limit' => $limit,
                    'offset' => $offset,
                ]);

            if (! $response->successful()) {
                return ['items' => [], 'totalItems' => 0, 'hasMore' => false];
            }

            $data = $response->json();
            $totalItems = $data['size'] ?? 0;
            $entries = $data['entries'] ?? [];

            $items = array_map(fn ($entry) => $this->transformWork($entry), $entries);

            return [
                'items' => $items,
                'totalItems' => $totalItems,
                'hasMore' => ($offset + count($items)) < $totalItems,
            ];
        } catch (\Exception $e) {
            Log::error('OpenLibrary author works exception', [
                'message' => $e->getMessage(),
                'key' => $authorKey,
            ]);

            return ['items' => [], 'totalItems' => 0, 'hasMore' => false];
        }
    }

    /**
     * Transform search result to standard format.
     */
    private function transformAuthorSearchResult(array $doc): array
    {
        return [
            'key' => $doc['key'] ?? '',
            'name' => $doc['name'] ?? 'Unknown',
            'alternate_names' => $doc['alternate_names'] ?? [],
            'birth_date' => $doc['birth_date'] ?? null,
            'death_date' => $doc['death_date'] ?? null,
            'top_work' => $doc['top_work'] ?? null,
            'work_count' => $doc['work_count'] ?? 0,
            'top_subjects' => array_slice($doc['top_subjects'] ?? [], 0, 5),
        ];
    }

    /**
     * Transform author detail response.
     */
    private function transformAuthorDetails(array $data, string $authorKey): array
    {
        $bio = null;
        if (isset($data['bio'])) {
            $bio = is_array($data['bio']) ? ($data['bio']['value'] ?? null) : $data['bio'];
        }

        $photoUrl = null;
        if (isset($data['photos']) && ! empty($data['photos'])) {
            $photoId = is_array($data['photos'][0]) ? $data['photos'][0]['id'] : $data['photos'][0];
            if ($photoId && $photoId > 0) {
                $photoUrl = "https://covers.openlibrary.org/a/id/{$photoId}-M.jpg";
            }
        }

        $links = [];
        if (isset($data['links']) && is_array($data['links'])) {
            $links = array_map(fn ($link) => [
                'title' => $link['title'] ?? 'Link',
                'url' => $link['url'] ?? '',
            ], $data['links']);
        }

        $wikipediaUrl = null;
        if (isset($data['wikipedia'])) {
            $wikipediaUrl = $data['wikipedia'];
        }

        return [
            'key' => $authorKey,
            'name' => $data['name'] ?? 'Unknown',
            'alternate_names' => $data['alternate_names'] ?? [],
            'birth_date' => $data['birth_date'] ?? null,
            'death_date' => $data['death_date'] ?? null,
            'bio' => $bio,
            'photo_url' => $photoUrl,
            'wikipedia_url' => $wikipediaUrl,
            'links' => $links,
        ];
    }

    /**
     * Transform work entry to standard format.
     */
    private function transformWork(array $entry): array
    {
        $key = $entry['key'] ?? '';
        if (str_starts_with($key, '/works/')) {
            $key = substr($key, 7);
        }

        $coverId = null;
        if (isset($entry['covers']) && ! empty($entry['covers'])) {
            $coverId = $entry['covers'][0];
        }

        return [
            'key' => $key,
            'title' => $entry['title'] ?? 'Untitled',
            'first_publish_year' => $entry['first_publish_date']
                ? (int) substr($entry['first_publish_date'], 0, 4)
                : null,
            'edition_count' => $entry['edition_count'] ?? 0,
            'cover_id' => $coverId,
            'subjects' => array_slice($entry['subjects'] ?? [], 0, 5),
        ];
    }

    /**
     * Build cache key for requests.
     */
    private function buildCacheKey(string $type, string $identifier, int $limit, int $offset): string
    {
        return sprintf(
            'openlibrary.author.%s.%s.%d.%d',
            $type,
            md5(strtolower($identifier)),
            $limit,
            $offset
        );
    }

    /**
     * Normalize author key (remove /authors/ prefix if present).
     */
    private function normalizeAuthorKey(string $key): string
    {
        if (str_starts_with($key, '/authors/')) {
            return substr($key, 9);
        }

        return $key;
    }

    /**
     * Check and hit the rate limiter.
     */
    private function checkRateLimit(): bool
    {
        $key = 'openlibrary-api';

        if (RateLimiter::tooManyAttempts($key, 60)) {
            return false;
        }

        RateLimiter::hit($key, 60);

        return true;
    }
}
