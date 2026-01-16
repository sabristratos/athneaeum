<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service for fetching book cover URLs from Google Books API.
 *
 * Uses ISBN lookup for accurate matching and caches results
 * to minimize API calls.
 */
class CoverFetchService
{
    private const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

    private const CACHE_TTL_HOURS = 24;

    /**
     * Fetch a cover URL for a book by ISBN.
     *
     * Tries ISBN first, falls back to title+author search if no ISBN.
     */
    public function fetchCoverUrl(?string $isbn, ?string $title = null, ?string $author = null): ?string
    {
        if ($isbn) {
            $cover = $this->fetchByIsbn($isbn);
            if ($cover) {
                return $cover;
            }
        }

        if ($title) {
            return $this->fetchByTitleAuthor($title, $author);
        }

        return null;
    }

    /**
     * Fetch cover URL by ISBN lookup.
     */
    public function fetchByIsbn(string $isbn): ?string
    {
        $isbn = preg_replace('/[^0-9X]/i', '', $isbn);
        if (strlen($isbn) < 10) {
            return null;
        }

        $cacheKey = "cover.isbn.{$isbn}";

        return Cache::remember($cacheKey, now()->addHours(self::CACHE_TTL_HOURS), function () use ($isbn) {
            try {
                $response = Http::timeout(10)
                    ->get(self::GOOGLE_BOOKS_URL, [
                        'q' => "isbn:{$isbn}",
                        'maxResults' => 1,
                        'fields' => 'items(volumeInfo/imageLinks)',
                    ]);

                if (! $response->successful()) {
                    return null;
                }

                $data = $response->json();
                $imageLinks = $data['items'][0]['volumeInfo']['imageLinks'] ?? null;

                return $this->extractBestCover($imageLinks);
            } catch (\Exception $e) {
                Log::debug('[CoverFetchService] ISBN lookup failed', [
                    'isbn' => $isbn,
                    'error' => $e->getMessage(),
                ]);

                return null;
            }
        });
    }

    /**
     * Fetch cover URL by title and author search.
     */
    public function fetchByTitleAuthor(string $title, ?string $author): ?string
    {
        $query = $this->buildSearchQuery($title, $author);
        $cacheKey = 'cover.search.'.md5($query);

        return Cache::remember($cacheKey, now()->addHours(self::CACHE_TTL_HOURS), function () use ($query, $title) {
            try {
                $response = Http::timeout(10)
                    ->get(self::GOOGLE_BOOKS_URL, [
                        'q' => $query,
                        'maxResults' => 5,
                        'fields' => 'items(volumeInfo/title,volumeInfo/imageLinks)',
                    ]);

                if (! $response->successful()) {
                    return null;
                }

                $data = $response->json();
                $items = $data['items'] ?? [];

                foreach ($items as $item) {
                    $itemTitle = $item['volumeInfo']['title'] ?? '';
                    if ($this->titlesMatch($title, $itemTitle)) {
                        $imageLinks = $item['volumeInfo']['imageLinks'] ?? null;
                        $cover = $this->extractBestCover($imageLinks);
                        if ($cover) {
                            return $cover;
                        }
                    }
                }

                if (! empty($items[0]['volumeInfo']['imageLinks'])) {
                    return $this->extractBestCover($items[0]['volumeInfo']['imageLinks']);
                }

                return null;
            } catch (\Exception $e) {
                Log::debug('[CoverFetchService] Title search failed', [
                    'query' => $query,
                    'error' => $e->getMessage(),
                ]);

                return null;
            }
        });
    }

    /**
     * Build a search query from title and author.
     */
    private function buildSearchQuery(string $title, ?string $author): string
    {
        $title = preg_replace('/\s*\([^)]*\)\s*/', '', $title);
        $title = preg_replace('/[^\w\s]/u', '', $title);
        $title = trim($title);

        $query = "intitle:\"{$title}\"";

        if ($author) {
            $authorParts = explode(',', $author);
            $primaryAuthor = trim($authorParts[0]);
            $primaryAuthor = preg_replace('/\s*\([^)]*\)\s*/', '', $primaryAuthor);
            $query .= " inauthor:\"{$primaryAuthor}\"";
        }

        return $query;
    }

    /**
     * Extract the best quality cover URL from image links.
     */
    private function extractBestCover(?array $imageLinks): ?string
    {
        if (! $imageLinks) {
            return null;
        }

        $preferredSizes = ['extraLarge', 'large', 'medium', 'thumbnail', 'smallThumbnail'];

        foreach ($preferredSizes as $size) {
            if (isset($imageLinks[$size])) {
                return $this->upgradeToHttps($imageLinks[$size]);
            }
        }

        return null;
    }

    /**
     * Upgrade cover URL to HTTPS and request larger size.
     */
    private function upgradeToHttps(string $url): string
    {
        $url = str_replace('http://', 'https://', $url);

        $url = preg_replace('/&edge=curl/', '', $url);

        if (! str_contains($url, 'zoom=')) {
            $url .= '&zoom=2';
        }

        return $url;
    }

    /**
     * Check if two titles are similar enough to be a match.
     */
    private function titlesMatch(string $title1, string $title2): bool
    {
        $normalize = function (string $s): string {
            $s = mb_strtolower($s);
            $s = preg_replace('/[^\w\s]/u', '', $s);
            $s = preg_replace('/\s+/', ' ', $s);

            return trim($s);
        };

        $t1 = $normalize($title1);
        $t2 = $normalize($title2);

        if ($t1 === $t2) {
            return true;
        }

        if (str_starts_with($t1, $t2) || str_starts_with($t2, $t1)) {
            return true;
        }

        similar_text($t1, $t2, $percent);

        return $percent > 80;
    }
}
