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

    private const FUZZY_MATCH_THRESHOLD = 0.85;

    /**
     * Search for an author and return enriched data if found with high similarity.
     *
     * This is the primary method for catalog ingestion - it combines search,
     * similarity validation, and metadata extraction into a single call.
     *
     * @return array{
     *     key: string,
     *     name: string,
     *     alternate_names: array,
     *     metadata: array
     * }|null
     */
    public function findAndEnrichAuthor(string $name): ?array
    {
        try {
            $results = $this->searchAuthors($name, limit: 5);

            if (empty($results['items'])) {
                return null;
            }

            foreach ($results['items'] as $item) {
                $similarity = $this->calculateSimilarity($name, $item['name']);
                if ($similarity >= self::FUZZY_MATCH_THRESHOLD) {
                    $details = $this->getAuthor($item['key']);
                    $data = $details ?? $item;

                    return [
                        'key' => $data['key'] ?? $item['key'],
                        'name' => $data['name'] ?? $item['name'],
                        'alternate_names' => $data['alternate_names'] ?? [],
                        'metadata' => $this->buildAuthorMetadata($data),
                    ];
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::warning('Open Library author enrichment failed', [
                'name' => $name,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function searchAuthors(string $query, int $limit = 20, int $offset = 0): array
    {
        $query = trim($query);
        if (strlen($query) < 2) {
            return ['items' => [], 'totalItems' => 0, 'hasMore' => false];
        }

        $cacheKey = $this->buildCacheKey('search', $query, $limit, $offset);

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($query, $limit, $offset) {
            $results = $this->executeAuthorSearch($query, $limit, $offset);

            if (empty($results['items']) && str_contains($query, ' ')) {
                $results = $this->executeFuzzySearch($query, $limit, $offset);
            }

            return $results;
        });
    }

    /**
     * Execute fuzzy search by trying multiple query variations.
     *
     * Strategies:
     * 1. Search by individual name parts (first name, last name)
     * 2. Remove common suffixes/prefixes
     * 3. Try phonetic variations
     */
    private function executeFuzzySearch(string $query, int $limit, int $offset): array
    {
        $parts = preg_split('/\s+/', $query);
        $allItems = [];
        $seenKeys = [];

        foreach ($parts as $part) {
            if (strlen($part) < 2) {
                continue;
            }

            $partResults = $this->executeAuthorSearch($part, $limit, 0);

            foreach ($partResults['items'] as $item) {
                if (isset($seenKeys[$item['key']])) {
                    continue;
                }

                if ($this->fuzzyMatchesQuery($item['name'], $query)) {
                    $allItems[] = $item;
                    $seenKeys[$item['key']] = true;
                }
            }
        }

        usort($allItems, fn ($a, $b) => $b['work_count'] <=> $a['work_count']);

        $paginatedItems = array_slice($allItems, $offset, $limit);

        return [
            'items' => $paginatedItems,
            'totalItems' => count($allItems),
            'hasMore' => ($offset + count($paginatedItems)) < count($allItems),
        ];
    }

    /**
     * Check if author name fuzzy-matches the query.
     */
    private function fuzzyMatchesQuery(string $authorName, string $query): bool
    {
        $normalizedName = strtolower($authorName);
        $normalizedQuery = strtolower($query);

        if (str_contains($normalizedName, $normalizedQuery)) {
            return true;
        }

        $queryParts = preg_split('/\s+/', $normalizedQuery);
        $matchedParts = 0;

        foreach ($queryParts as $part) {
            if (strlen($part) < 2) {
                continue;
            }

            if (str_contains($normalizedName, $part)) {
                $matchedParts++;
                continue;
            }

            foreach (explode(' ', $normalizedName) as $namePart) {
                if ($this->soundsLike($part, $namePart)) {
                    $matchedParts++;
                    break;
                }
            }
        }

        return $matchedParts >= count($queryParts) * 0.5;
    }

    /**
     * Check if two strings sound similar using metaphone.
     */
    private function soundsLike(string $a, string $b): bool
    {
        if (strlen($a) < 2 || strlen($b) < 2) {
            return false;
        }

        $metaA = metaphone($a);
        $metaB = metaphone($b);

        if ($metaA === $metaB) {
            return true;
        }

        similar_text($metaA, $metaB, $percent);

        return $percent >= 75;
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
        $key = $doc['key'] ?? '';
        $photoUrl = null;

        if ($key) {
            $photoUrl = "https://covers.openlibrary.org/a/olid/{$key}-M.jpg";
        }

        return [
            'key' => $key,
            'name' => $doc['name'] ?? 'Unknown',
            'alternate_names' => $doc['alternate_names'] ?? [],
            'birth_date' => $doc['birth_date'] ?? null,
            'death_date' => $doc['death_date'] ?? null,
            'top_work' => $doc['top_work'] ?? null,
            'work_count' => $doc['work_count'] ?? 0,
            'top_subjects' => array_slice($doc['top_subjects'] ?? [], 0, 5),
            'photo_url' => $photoUrl,
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

    /**
     * Build comprehensive metadata array from Open Library data.
     *
     * Extracts all available author information into a structured format
     * suitable for storage in the authors.metadata column.
     */
    private function buildAuthorMetadata(array $olData): array
    {
        $metadata = [];

        if (! empty($olData['bio'])) {
            $metadata['bio'] = is_array($olData['bio'])
                ? ($olData['bio']['value'] ?? '')
                : $olData['bio'];
        }

        if (! empty($olData['birth_date'])) {
            $metadata['birth_date'] = $olData['birth_date'];
        }

        if (! empty($olData['death_date'])) {
            $metadata['death_date'] = $olData['death_date'];
        }

        if (! empty($olData['photo_url'])) {
            $metadata['photo_url'] = $olData['photo_url'];
        } elseif (! empty($olData['photos']) && is_array($olData['photos'])) {
            $photoId = $this->extractPhotoId($olData['photos']);
            if ($photoId) {
                $metadata['photo_url'] = "https://covers.openlibrary.org/a/id/{$photoId}-L.jpg";
            }
        }

        if (! empty($olData['wikipedia_url'])) {
            $metadata['wikipedia_url'] = $olData['wikipedia_url'];
        } elseif (! empty($olData['wikipedia'])) {
            $metadata['wikipedia_url'] = $olData['wikipedia'];
        }

        if (! empty($olData['top_work'])) {
            $metadata['top_work'] = $olData['top_work'];
        }

        if (! empty($olData['work_count'])) {
            $metadata['work_count'] = $olData['work_count'];
        }

        if (! empty($olData['links']) && is_array($olData['links'])) {
            $metadata['links'] = array_map(fn ($link) => [
                'title' => $link['title'] ?? 'Link',
                'url' => $link['url'] ?? '',
            ], array_slice($olData['links'], 0, 5));
        }

        if (! empty($olData['remote_ids']) && is_array($olData['remote_ids'])) {
            $metadata['external_ids'] = $olData['remote_ids'];
        }

        if (! empty($olData['fuller_name'])) {
            $metadata['fuller_name'] = $olData['fuller_name'];
        }

        if (! empty($olData['personal_name'])) {
            $metadata['personal_name'] = $olData['personal_name'];
        }

        if (! empty($olData['entity_type'])) {
            $metadata['entity_type'] = $olData['entity_type'];
        }

        return $metadata;
    }

    /**
     * Extract a valid photo ID from Open Library photos array.
     */
    private function extractPhotoId(array $photos): ?int
    {
        foreach ($photos as $photoId) {
            $id = is_array($photoId) ? ($photoId['id'] ?? $photoId) : $photoId;
            if (is_numeric($id) && (int) $id > 0) {
                return (int) $id;
            }
        }

        return null;
    }

    /**
     * Calculate similarity between two strings.
     */
    private function calculateSimilarity(string $a, string $b): float
    {
        similar_text(strtolower($a), strtolower($b), $percent);

        return $percent / 100;
    }
}
