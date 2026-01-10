<?php

declare(strict_types=1);

namespace App\Services\BookSearch;

use App\Contracts\BookSearchServiceInterface;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;

/**
 * Google Books API implementation of the book search service.
 *
 * Uses a dual-query strategy to improve search relevance:
 * 1. Title search (intitle:) to find books matching the query in the title
 * 2. Regular search to get Google's relevance ranking
 *
 * Results are merged, deduplicated, and scored based on title match,
 * ratings, relevance, and metadata completeness.
 */
class GoogleBooksService implements BookSearchServiceInterface
{
    private const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

    private const STOP_WORDS = ['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'is', 'it'];

    public function search(
        string $query,
        int $limit = 20,
        int $startIndex = 0,
        ?string $langRestrict = null,
        ?array $genres = null,
        ?float $minRating = null,
        ?int $yearFrom = null,
        ?int $yearTo = null
    ): array {
        $baseParams = [
            'maxResults' => 40,
            'startIndex' => $startIndex,
            'key' => config('services.google_books.key'),
            'printType' => 'books',
        ];

        if ($langRestrict !== null) {
            $baseParams['langRestrict'] = $langRestrict;
        }

        $searchQuery = $this->buildSearchQuery($query, $genres);
        $titleQuery = $this->buildTitleQuery($query);

        $responses = Http::pool(fn (Pool $pool) => [
            $pool->get(self::BASE_URL, ['q' => $titleQuery] + $baseParams),
            $pool->get(self::BASE_URL, ['q' => $searchQuery] + $baseParams),
        ]);

        $titleResults = $responses[0]->successful()
            ? $responses[0]->json('items', [])
            : [];
        $regularResults = $responses[1]->successful()
            ? $responses[1]->json('items', [])
            : [];
        $totalItems = $responses[1]->successful()
            ? $responses[1]->json('totalItems', 0)
            : 0;

        $items = $this->mergeAndRankResults(
            $titleResults,
            $regularResults,
            $query,
            $limit,
            $langRestrict,
            $genres,
            $minRating,
            $yearFrom,
            $yearTo
        );

        return [
            'items' => $items,
            'totalItems' => $totalItems,
            'startIndex' => $startIndex,
            'hasMore' => ($startIndex + count($items)) < $totalItems,
        ];
    }

    public function findByExternalId(string $externalId): ?array
    {
        $response = Http::get(self::BASE_URL.'/'.$externalId, [
            'key' => config('services.google_books.key'),
        ]);

        if (! $response->successful()) {
            return null;
        }

        return $this->transformBook($response->json());
    }

    public function getProviderName(): string
    {
        return 'google_books';
    }

    /**
     * Build search query with optional genre/subject filter.
     *
     * If genres are provided, appends the first genre as a subject filter
     * since Google Books API only supports one subject keyword effectively.
     */
    private function buildSearchQuery(string $query, ?array $genres): string
    {
        if (! empty($genres)) {
            return $query.' subject:'.str_replace(' ', '+', $genres[0]);
        }

        return $query;
    }

    /**
     * Build an optimized title search query by extracting key words.
     *
     * Removes common stop words and wraps in intitle: with quotes for better matching.
     * Example: "the fellowship" becomes intitle:"fellowship"
     */
    private function buildTitleQuery(string $query): string
    {
        $words = preg_split('/\s+/', strtolower(trim($query)));
        $keyWords = array_filter($words, fn ($w) => strlen($w) > 1 && ! in_array($w, self::STOP_WORDS, true));

        if (empty($keyWords)) {
            $keyWords = $words;
        }

        $keyPhrase = implode(' ', $keyWords);

        return 'intitle:"'.$keyPhrase.'"';
    }

    /**
     * Merge results from title and regular searches, deduplicate, and rank.
     *
     * Applies post-filtering for language, rating, year range, and genres
     * since Google Books API doesn't natively support all these filters.
     */
    private function mergeAndRankResults(
        array $titleResults,
        array $regularResults,
        string $query,
        int $limit,
        ?string $langRestrict = null,
        ?array $genres = null,
        ?float $minRating = null,
        ?int $yearFrom = null,
        ?int $yearTo = null
    ): array {
        $combined = [];
        $seenIds = [];

        foreach ($titleResults as $item) {
            $id = $item['id'] ?? null;
            if ($id && ! isset($seenIds[$id])) {
                $seenIds[$id] = true;
                $combined[] = ['item' => $item, 'fromTitle' => true, 'position' => count($combined)];
            }
        }

        foreach ($regularResults as $item) {
            $id = $item['id'] ?? null;
            if ($id && ! isset($seenIds[$id])) {
                $seenIds[$id] = true;
                $combined[] = ['item' => $item, 'fromTitle' => false, 'position' => count($combined)];
            }
        }

        $total = count($combined);
        if ($total === 0) {
            return [];
        }

        return collect($combined)
            ->map(function ($entry) use ($total, $query) {
                $book = $this->transformBook($entry['item']);
                if (! $book) {
                    return null;
                }

                $book['_score'] = $this->calculateScore(
                    $entry['position'],
                    $total,
                    $book,
                    $query,
                    $entry['fromTitle']
                );

                return $book;
            })
            ->filter()
            ->when($langRestrict, function ($collection) use ($langRestrict) {
                return $collection->filter(function ($book) use ($langRestrict) {
                    $bookLang = $book['language'] ?? '';

                    return str_starts_with($bookLang, $langRestrict);
                });
            })
            ->when($minRating > 0, function ($collection) use ($minRating) {
                return $collection->filter(function ($book) use ($minRating) {
                    return ($book['average_rating'] ?? 0) >= $minRating;
                });
            })
            ->when($yearFrom || $yearTo, function ($collection) use ($yearFrom, $yearTo) {
                return $collection->filter(function ($book) use ($yearFrom, $yearTo) {
                    $year = $this->extractYear($book['published_date'] ?? null);
                    if (! $year) {
                        return false;
                    }
                    if ($yearFrom && $year < $yearFrom) {
                        return false;
                    }
                    if ($yearTo && $year > $yearTo) {
                        return false;
                    }

                    return true;
                });
            })
            ->when(! empty($genres) && count($genres) > 1, function ($collection) use ($genres) {
                return $collection->filter(function ($book) use ($genres) {
                    $bookGenres = array_map('strtolower', $book['genres'] ?? []);
                    foreach ($genres as $genre) {
                        foreach ($bookGenres as $bookGenre) {
                            if (str_contains($bookGenre, strtolower($genre))) {
                                return true;
                            }
                        }
                    }

                    return false;
                });
            })
            ->sortByDesc('_score')
            ->map(fn ($book) => collect($book)->except(['_score', 'language'])->all())
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * Calculate combined score using multiple signals.
     */
    private function calculateScore(
        int $position,
        int $total,
        array $book,
        string $query,
        bool $fromTitleSearch
    ): float {
        $relevanceScore = ($total - $position) / $total;
        $titleMatchScore = $this->calculateTitleMatchScore($book['title'] ?? '', $query);

        if ($fromTitleSearch) {
            $titleMatchScore = max($titleMatchScore, 0.6);
        }

        $ratingScore = $this->calculateRatingScore($book);
        $completenessScore = $this->calculateCompletenessScore($book);

        return ($ratingScore * 0.40)
             + ($titleMatchScore * 0.30)
             + ($relevanceScore * 0.15)
             + ($completenessScore * 0.15);
    }

    /**
     * Score based on how well the title matches the query.
     */
    private function calculateTitleMatchScore(string $title, string $query): float
    {
        $title = strtolower($title);
        $query = strtolower(trim($query));

        if ($title === $query) {
            return 1.0;
        }

        if (str_contains($title, $query)) {
            return 0.85;
        }

        $queryWords = array_filter(explode(' ', $query), fn ($w) => strlen($w) > 2);
        if (empty($queryWords)) {
            return 0;
        }

        $titleWords = explode(' ', $title);
        $matchCount = count(array_intersect($queryWords, $titleWords));

        return ($matchCount / count($queryWords)) * 0.7;
    }

    /**
     * Score based on ratings data when available.
     *
     * Rated books score based on quality (average rating) and quantity (review count).
     * Unrated books receive a low penalty score to push them below rated books.
     */
    private function calculateRatingScore(array $book): float
    {
        $ratingsCount = $book['ratings_count'] ?? 0;
        $averageRating = $book['average_rating'] ?? 0;

        if ($ratingsCount > 0 && $averageRating > 0) {
            $qualityScore = $averageRating / 5;
            $quantityScore = min(log10($ratingsCount + 1) / 4, 1);

            return ($qualityScore * 0.6) + ($quantityScore * 0.4);
        }

        return 0.1;
    }

    /**
     * Score based on metadata completeness.
     */
    private function calculateCompletenessScore(array $book): float
    {
        $score = 0;

        if (! empty($book['cover_url'])) {
            $score += 0.25;
        }
        if (! empty($book['description'])) {
            $score += 0.25;
        }
        if (! empty($book['isbn'])) {
            $score += 0.25;
        }
        if (! empty($book['page_count'])) {
            $score += 0.25;
        }

        return $score;
    }

    /**
     * Transform a single Google Books API response to our format.
     */
    private function transformBook(array $item): ?array
    {
        $volumeInfo = $item['volumeInfo'] ?? [];

        if (empty($volumeInfo['title'])) {
            return null;
        }

        return [
            'external_id' => $item['id'] ?? null,
            'title' => $volumeInfo['title'],
            'author' => $this->extractAuthors($volumeInfo),
            'cover_url' => $this->extractCoverUrl($volumeInfo),
            'page_count' => $volumeInfo['pageCount'] ?? null,
            'isbn' => $this->extractIsbn($volumeInfo),
            'description' => $volumeInfo['description'] ?? null,
            'genres' => $volumeInfo['categories'] ?? [],
            'published_date' => $this->parsePublishedDate($volumeInfo['publishedDate'] ?? null),
            'average_rating' => $volumeInfo['averageRating'] ?? null,
            'ratings_count' => $volumeInfo['ratingsCount'] ?? null,
            'language' => $volumeInfo['language'] ?? null,
        ];
    }

    /**
     * Extract authors from volume info.
     */
    private function extractAuthors(array $volumeInfo): string
    {
        $authors = $volumeInfo['authors'] ?? ['Unknown Author'];

        return implode(', ', $authors);
    }

    /**
     * Extract the best available cover URL.
     */
    private function extractCoverUrl(array $volumeInfo): ?string
    {
        $imageLinks = $volumeInfo['imageLinks'] ?? [];

        $coverUrl = $imageLinks['thumbnail']
            ?? $imageLinks['smallThumbnail']
            ?? null;

        if ($coverUrl) {
            return str_replace('http://', 'https://', $coverUrl);
        }

        return null;
    }

    /**
     * Extract ISBN (prefer ISBN_13 over ISBN_10).
     */
    private function extractIsbn(array $volumeInfo): ?string
    {
        $identifiers = $volumeInfo['industryIdentifiers'] ?? [];

        foreach ($identifiers as $identifier) {
            if ($identifier['type'] === 'ISBN_13') {
                return $identifier['identifier'];
            }
        }

        foreach ($identifiers as $identifier) {
            if ($identifier['type'] === 'ISBN_10') {
                return $identifier['identifier'];
            }
        }

        return null;
    }

    /**
     * Parse published date (Google returns various formats).
     */
    private function parsePublishedDate(?string $date): ?string
    {
        if (! $date) {
            return null;
        }

        if (preg_match('/^\d{4}$/', $date)) {
            return $date.'-01-01';
        }

        if (preg_match('/^\d{4}-\d{2}$/', $date)) {
            return $date.'-01';
        }

        return $date;
    }

    /**
     * Extract year from a published date string.
     *
     * Handles formats: "2024-01-15", "2024-01", "2024"
     */
    private function extractYear(?string $date): ?int
    {
        if (! $date) {
            return null;
        }

        if (preg_match('/^(\d{4})/', $date, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }
}
