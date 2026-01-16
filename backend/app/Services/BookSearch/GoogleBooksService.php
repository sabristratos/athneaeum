<?php

declare(strict_types=1);

namespace App\Services\BookSearch;

use App\Contracts\BookSearchServiceInterface;
use App\Exceptions\BookSearchException;
use App\Services\BookSearch\Concerns\HasResilientHttp;
use App\Support\IsbnUtility;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
    use HasResilientHttp;

    private const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

    private const STOP_WORDS = ['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'is', 'it'];

    private const CACHE_TTL_MINUTES = 15;

    private const NON_SERIES_INDICATORS = [
        'edition', 'anniversary', 'revised', 'updated', 'expanded',
        'illustrated', 'unabridged', 'complete works', 'collected',
        'omnibus', 'box set', 'boxed set', 'compilation', 'anthology',
        'treasury', 'deluxe', 'special edition', 'commemorative',
    ];

    private const NUMERIC_TITLES = [
        '1984', '2001', '2010', '2061', '3001', '2666', '1Q84',
        'catch-22', 'fahrenheit 451', 'slaughterhouse-five',
        'twenty thousand leagues', 'around the world in 80 days',
        'the 39 steps', '11/22/63', '14', '77 shadow street',
        'room 1408', 'apollo 13', 'ocean\'s eleven', 'the 5th wave',
    ];

    /**
     * @throws BookSearchException
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
    ): array {
        $this->checkRateLimit('google-books-api');
        $this->checkCircuitBreaker('google-books');

        $cacheKey = $this->buildCacheKey($query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use (
            $query,
            $limit,
            $startIndex,
            $langRestrict,
            $genres,
            $minRating,
            $yearFrom,
            $yearTo
        ) {
            return $this->executeSearch($query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        });
    }

    /**
     * Build a unique cache key for the search parameters.
     */
    private function buildCacheKey(
        string $query,
        int $limit,
        int $startIndex,
        ?string $langRestrict,
        ?array $genres,
        ?float $minRating,
        ?int $yearFrom,
        ?int $yearTo
    ): string {
        $params = [
            'q' => strtolower(trim($query)),
            'l' => $limit,
            's' => $startIndex,
            'lang' => $langRestrict,
            'g' => ! empty($genres) ? implode(',', $genres) : null,
            'r' => $minRating,
            'yf' => $yearFrom,
            'yt' => $yearTo,
        ];

        return 'books.search.'.md5(serialize($params));
    }

    /**
     * Execute the actual search against the Google Books API.
     *
     * @throws BookSearchException When both API requests fail after retries
     */
    private function executeSearch(
        string $query,
        int $limit,
        int $startIndex,
        ?string $langRestrict,
        ?array $genres,
        ?float $minRating,
        ?int $yearFrom,
        ?int $yearTo
    ): array {
        $timeout = $this->getTimeout();
        $baseParams = [
            'maxResults' => 40,
            'startIndex' => $startIndex,
            'key' => config('services.google_books.key'),
            'printType' => 'books',
        ];

        if ($langRestrict !== null) {
            $baseParams['langRestrict'] = $langRestrict;
        }

        if (IsbnUtility::isValid($query)) {
            return $this->executeIsbnSearch($query, $limit, $baseParams, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        }

        $searchQuery = $this->buildSearchQuery($query, $genres);
        $titleQuery = $this->buildTitleQuery($query);

        $responses = $this->executeWithRetry('google-books', function () use ($timeout, $titleQuery, $searchQuery, $baseParams) {
            return Http::timeout($timeout)->pool(fn (Pool $pool) => [
                $pool->timeout($timeout)->get(self::BASE_URL, ['q' => $titleQuery] + $baseParams),
                $pool->timeout($timeout)->get(self::BASE_URL, ['q' => $searchQuery] + $baseParams),
            ]);
        });

        $titleFailed = ! $responses[0]->successful();
        $regularFailed = ! $responses[1]->successful();

        if ($titleFailed && $regularFailed) {
            Log::error('Google Books API: Both search requests failed', [
                'query' => $query,
                'title_status' => $responses[0]->status(),
                'regular_status' => $responses[1]->status(),
            ]);
            $this->recordFailure('google-books');
            throw BookSearchException::serviceUnavailable();
        }

        $this->recordSuccess('google-books');

        if ($titleFailed) {
            Log::warning('Google Books API: Title search failed', [
                'query' => $query,
                'status' => $responses[0]->status(),
            ]);
        }

        if ($regularFailed) {
            Log::warning('Google Books API: Regular search failed', [
                'query' => $query,
                'status' => $responses[1]->status(),
            ]);
        }

        $titleResults = $titleFailed ? [] : $responses[0]->json('items', []);
        $regularResults = $regularFailed ? [] : $responses[1]->json('items', []);
        $totalItems = $regularFailed ? 0 : $responses[1]->json('totalItems', 0);

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
        try {
            $timeout = $this->getTimeout();
            $response = $this->executeWithRetry('google-books', function () use ($externalId, $timeout) {
                return Http::timeout($timeout)->get(self::BASE_URL.'/'.$externalId, [
                    'key' => config('services.google_books.key'),
                ]);
            });

            if (! $response->successful()) {
                return null;
            }

            return $this->transformBook($response->json());
        } catch (BookSearchException) {
            return null;
        }
    }

    /**
     * Search for all editions of a book by title and author.
     *
     * Returns ungrouped results so users can pick a specific edition.
     */
    public function searchEditions(string $title, string $author, int $limit = 20): array
    {
        $cacheKey = 'books.editions.'.md5(strtolower($title).'|'.strtolower($author));

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($title, $author, $limit) {
            $query = 'intitle:"'.$title.'" inauthor:"'.$author.'"';
            $timeout = $this->getTimeout();

            try {
                $response = $this->executeWithRetry('google-books', function () use ($query, $limit, $timeout) {
                    return Http::timeout($timeout)->get(self::BASE_URL, [
                        'q' => $query,
                        'maxResults' => min($limit, 40),
                        'key' => config('services.google_books.key'),
                        'printType' => 'books',
                    ]);
                });

                if (! $response->successful()) {
                    return [];
                }
            } catch (BookSearchException) {
                return [];
            }

            $items = $response->json('items', []);

            return collect($items)
                ->map(fn ($item) => $this->transformBook($item))
                ->filter()
                ->filter(function ($book) use ($title) {
                    $bookTitle = strtolower($book['title'] ?? '');
                    $searchTitle = strtolower($title);
                    $bookTitleNormalized = preg_replace('/[:–—-].*$/', '', $bookTitle);
                    $searchTitleNormalized = preg_replace('/[:–—-].*$/', '', $searchTitle);

                    return str_contains($bookTitleNormalized, $searchTitleNormalized)
                        || str_contains($searchTitleNormalized, $bookTitleNormalized);
                })
                ->sortByDesc(function ($book) {
                    $score = 0;
                    if (! empty($book['cover_url'])) {
                        $score += 3;
                    }
                    if (! empty($book['page_count']) && $book['page_count'] > 0) {
                        $score += 2;
                    }
                    if (! empty($book['isbn'])) {
                        $score += 2;
                    }
                    if (! empty($book['published_date'])) {
                        $score += 1;
                    }

                    return $score;
                })
                ->values()
                ->all();
        });
    }

    public function getProviderName(): string
    {
        return 'google_books';
    }

    /**
     * Look up a book for enrichment purposes.
     *
     * Tries ISBN first (most accurate), then falls back to title + author.
     * Returns the best matching result with cover and metadata.
     */
    public function lookupForEnrichment(?string $isbn, string $title, string $author): ?array
    {
        if (! empty($isbn)) {
            $result = $this->searchByIsbn($isbn);
            if ($result) {
                return $result;
            }
        }

        return $this->searchByTitleAuthor($title, $author);
    }

    /**
     * Search by ISBN and return the first matching result.
     */
    private function searchByIsbn(string $isbn): ?array
    {
        $cleaned = preg_replace('/[\s\-]/', '', trim($isbn));
        $query = 'isbn:'.$cleaned;
        $timeout = $this->getTimeout();

        try {
            $response = $this->executeWithRetry('google-books', function () use ($query, $timeout) {
                return Http::timeout($timeout)->get(self::BASE_URL, [
                    'q' => $query,
                    'maxResults' => 1,
                    'key' => config('services.google_books.key'),
                ]);
            });

            if (! $response->successful()) {
                return null;
            }

            $items = $response->json('items', []);
            if (empty($items)) {
                return null;
            }

            return $this->transformBook($items[0]);
        } catch (BookSearchException) {
            return null;
        }
    }

    /**
     * Search by title and author, return the best matching result.
     */
    private function searchByTitleAuthor(string $title, string $author): ?array
    {
        $authorParts = explode(',', $author);
        $primaryAuthor = trim($authorParts[0]);

        $query = 'intitle:"'.$title.'" inauthor:"'.$primaryAuthor.'"';
        $timeout = $this->getTimeout();

        try {
            $response = $this->executeWithRetry('google-books', function () use ($query, $timeout) {
                return Http::timeout($timeout)->get(self::BASE_URL, [
                    'q' => $query,
                    'maxResults' => 5,
                    'key' => config('services.google_books.key'),
                    'printType' => 'books',
                ]);
            });

            if (! $response->successful()) {
                return null;
            }

            $items = $response->json('items', []);
            if (empty($items)) {
                return null;
            }

            $normalizedTitle = strtolower(trim($title));

            foreach ($items as $item) {
                $book = $this->transformBook($item);
                if (! $book) {
                    continue;
                }

                $bookTitle = strtolower($book['title'] ?? '');

                if ($bookTitle === $normalizedTitle || str_contains($bookTitle, $normalizedTitle) || str_contains($normalizedTitle, $bookTitle)) {
                    if (! empty($book['cover_url'])) {
                        return $book;
                    }
                }
            }

            $firstBook = $this->transformBook($items[0]);
            if ($firstBook && ! empty($firstBook['cover_url'])) {
                return $firstBook;
            }

            return null;
        } catch (BookSearchException) {
            return null;
        }
    }

    /**
     * Build search query with optional genre/subject filters.
     *
     * Appends all genres as subject filters using OR logic. Google Books API
     * supports multiple subject keywords, though results may vary in quality.
     */
    private function buildSearchQuery(string $query, ?array $genres): string
    {
        if (empty($genres)) {
            return $query;
        }

        $subjectParts = array_map(
            fn (string $genre) => 'subject:'.str_replace(' ', '+', $genre),
            $genres
        );

        return $query.' '.implode('+OR+', $subjectParts);
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
            ->when($minRating !== null && $minRating > 0, function ($collection) use ($minRating) {
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
            ->pipe(fn ($collection) => $this->groupEditions($collection))
            ->map(fn ($book) => collect($book)->except(['_score', 'language', '_work_key'])->all())
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * Group books by normalized title + author (work key) and keep the best edition.
     *
     * This collapses duplicate editions (paperback, hardcover, etc.) into a single
     * result with an edition_count field. The edition with the highest score and
     * most complete metadata is kept as the primary result.
     *
     * @param  \Illuminate\Support\Collection  $books
     * @return \Illuminate\Support\Collection
     */
    private function groupEditions($books)
    {
        return $books
            ->map(function ($book) {
                $book['_work_key'] = $this->generateWorkKey($book['title'] ?? '', $book['author'] ?? '');

                return $book;
            })
            ->groupBy('_work_key')
            ->map(function ($editions) {
                $best = $editions->sortByDesc(function ($book) {
                    $score = $book['_score'] ?? 0;
                    $completeness = (
                        (! empty($book['cover_url']) ? 1 : 0) +
                        (! empty($book['page_count']) && $book['page_count'] > 0 ? 1 : 0) +
                        (! empty($book['isbn']) ? 1 : 0) +
                        (! empty($book['description']) ? 1 : 0)
                    ) / 4;

                    return $score + ($completeness * 0.1);
                })->first();

                $best['edition_count'] = $editions->count();

                return $best;
            })
            ->sortByDesc('_score');
    }

    /**
     * Generate a normalized work key for grouping editions.
     *
     * Normalizes title and author by:
     * - Converting to lowercase
     * - Removing subtitles (after : or -)
     * - Removing common stop words
     * - Removing special characters
     * - Taking first author only
     */
    private function generateWorkKey(string $title, string $author): string
    {
        $normalizedTitle = strtolower(trim($title));
        $normalizedTitle = preg_replace('/[:–—-].*$/', '', $normalizedTitle);
        $normalizedTitle = preg_replace('/\([^)]*\)/', '', $normalizedTitle);
        $normalizedTitle = preg_replace('/[^a-z0-9\s]/', '', $normalizedTitle);

        $words = preg_split('/\s+/', $normalizedTitle);
        $words = array_filter($words, fn ($w) => ! in_array($w, self::STOP_WORDS, true) && strlen($w) > 1);
        $normalizedTitle = implode(' ', array_slice($words, 0, 5));

        $normalizedAuthor = strtolower(trim($author));
        $normalizedAuthor = explode(',', $normalizedAuthor)[0];
        $normalizedAuthor = preg_replace('/[^a-z\s]/', '', $normalizedAuthor);
        $authorWords = preg_split('/\s+/', $normalizedAuthor);
        $normalizedAuthor = implode(' ', array_slice($authorWords, 0, 2));

        return $normalizedTitle.'|'.$normalizedAuthor;
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

        $dimensions = $this->extractDimensions($volumeInfo);
        $seriesInfo = $this->extractSeriesInfo($volumeInfo);

        return [
            'external_id' => $item['id'] ?? null,
            'title' => $volumeInfo['title'],
            'author' => $this->extractAuthors($volumeInfo),
            'cover_url' => $this->extractCoverUrl($volumeInfo),
            'page_count' => $volumeInfo['pageCount'] ?? null,
            'height_cm' => $dimensions['height_cm'],
            'width_cm' => $dimensions['width_cm'],
            'thickness_cm' => $dimensions['thickness_cm'],
            'isbn' => $this->extractIsbn($volumeInfo),
            'description' => $volumeInfo['description'] ?? null,
            'genres' => $volumeInfo['categories'] ?? [],
            'published_date' => $this->parsePublishedDate($volumeInfo['publishedDate'] ?? null),
            'average_rating' => $volumeInfo['averageRating'] ?? null,
            'ratings_count' => $volumeInfo['ratingsCount'] ?? null,
            'language' => $volumeInfo['language'] ?? null,
            'series_name' => $seriesInfo['series_name'],
            'volume_number' => $seriesInfo['volume_number'],
        ];
    }

    /**
     * Extract and normalize physical dimensions from volume info.
     *
     * Google Books returns dimensions in various formats like "24.00 cm" or "9.5 inches".
     * All values are normalized to centimeters.
     *
     * @return array{height_cm: float|null, width_cm: float|null, thickness_cm: float|null}
     */
    private function extractDimensions(array $volumeInfo): array
    {
        $dimensions = $volumeInfo['dimensions'] ?? [];

        return [
            'height_cm' => $this->parseDimension($dimensions['height'] ?? null),
            'width_cm' => $this->parseDimension($dimensions['width'] ?? null),
            'thickness_cm' => $this->parseDimension($dimensions['thickness'] ?? null),
        ];
    }

    /**
     * Parse a dimension string and normalize to centimeters.
     *
     * Handles formats like "24.00 cm", "9.5 inches", "2.74 cm"
     */
    private function parseDimension(?string $value): ?float
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        if (preg_match('/^([\d.]+)\s*(cm|in|inches)?$/i', trim($value), $matches)) {
            $number = (float) $matches[1];
            $unit = strtolower($matches[2] ?? 'cm');

            return match ($unit) {
                'in', 'inches' => round($number * 2.54, 2),
                default => round($number, 2),
            };
        }

        return null;
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
     * Extract series name and volume number from title/subtitle.
     *
     * Detects patterns like:
     * - "Book 1", "Book One", "Vol. 2", "Volume 3", "#4", "Part 5"
     * - "(Series Name, #1)", "(Series Name Book 1)"
     * - "Series Name: Book Title" with volume indicator in subtitle
     * - Roman numerals: "Book I", "Volume II", "Part III"
     * - Ordinals: "1st Book", "2nd Volume", "3rd Part"
     * - Story/Episode/Arc indicators
     * - Decimal volumes for novellas: "Book 1.5"
     *
     * @return array{series_name: string|null, volume_number: int|null}
     */
    private function extractSeriesInfo(array $volumeInfo): array
    {
        $title = $volumeInfo['title'] ?? '';
        $subtitle = $volumeInfo['subtitle'] ?? '';
        $normalizedTitle = $this->normalizeText($title);
        $normalizedSubtitle = $this->normalizeText($subtitle);
        $fullText = trim($normalizedTitle.' '.$normalizedSubtitle);
        $originalFullText = trim($title.' '.$subtitle);

        $seriesName = null;
        $volumeNumber = null;

        $seriesPatterns = [
            '/\(([^)]+?)\s*[,:]?\s*#(\d+(?:\.\d+)?)\s*\)/i',
            '/\(([^)]+?)\s+Book\s+(\d+(?:\.\d+)?)\s*\)/i',
            '/\(([^)]+?)\s+Vol(?:ume)?\.?\s*(\d+(?:\.\d+)?)\s*\)/i',
            '/\(([^)]+?)\s+Part\s+(\d+(?:\.\d+)?)\s*\)/i',
            '/\(([^)]+?)\s+Story\s+(\d+(?:\.\d+)?)\s*\)/i',
            '/^(.+?)\s+Series[,:]?\s+Book\s+(\d+)/i',
            '/^(.+?)\s+Saga[,:]?\s+Book\s+(\d+)/i',
            '/^(.+?)\s+Chronicles?[,:]?\s+Book\s+(\d+)/i',
            '/^(.+?)\s+Trilogy[,:]?\s+Book\s+(\d+)/i',
            '/^(.+?)\s+Quartet[,:]?\s+Book\s+(\d+)/i',
            '/^(.+?)\s+Cycle[,:]?\s+Book\s+(\d+)/i',
            '/^(.+?)\s+Universe[,:]?\s+(?:Book|Novel)\s+(\d+)/i',
        ];

        foreach ($seriesPatterns as $pattern) {
            if (preg_match($pattern, $fullText, $matches)) {
                $candidateSeries = trim($matches[1], " \t\n\r\0\x0B,;:");
                $candidateVolume = (int) floor((float) $matches[2]);

                if ($this->isValidSeriesExtraction($originalFullText, $candidateSeries, $candidateVolume)) {
                    return ['series_name' => $candidateSeries, 'volume_number' => $candidateVolume];
                }
            }
        }

        $volumeNumber = $this->extractVolumeNumber($fullText);

        if ($volumeNumber !== null) {
            $seriesName = $this->inferSeriesName($normalizedTitle, $normalizedSubtitle, $volumeNumber);
        }

        if ($this->isValidSeriesExtraction($originalFullText, $seriesName, $volumeNumber)) {
            return [
                'series_name' => $seriesName,
                'volume_number' => $volumeNumber,
            ];
        }

        return [
            'series_name' => null,
            'volume_number' => null,
        ];
    }

    /**
     * Extract volume number from text using various patterns.
     *
     * Supports: digits, word numbers, ordinals, roman numerals.
     * Handles: Book, Volume, Part, Episode, Story, Arc, Installment, Novel.
     */
    private function extractVolumeNumber(string $text): ?int
    {
        $numberWords = [
            'one' => 1, 'two' => 2, 'three' => 3, 'four' => 4, 'five' => 5,
            'six' => 6, 'seven' => 7, 'eight' => 8, 'nine' => 9, 'ten' => 10,
            'eleven' => 11, 'twelve' => 12, 'thirteen' => 13, 'fourteen' => 14, 'fifteen' => 15,
            'sixteen' => 16, 'seventeen' => 17, 'eighteen' => 18, 'nineteen' => 19, 'twenty' => 20,
            'first' => 1, 'second' => 2, 'third' => 3, 'fourth' => 4, 'fifth' => 5,
            'sixth' => 6, 'seventh' => 7, 'eighth' => 8, 'ninth' => 9, 'tenth' => 10,
        ];

        $romanNumerals = [
            'I' => 1, 'II' => 2, 'III' => 3, 'IV' => 4, 'V' => 5,
            'VI' => 6, 'VII' => 7, 'VIII' => 8, 'IX' => 9, 'X' => 10,
            'XI' => 11, 'XII' => 12, 'XIII' => 13, 'XIV' => 14, 'XV' => 15,
            'XVI' => 16, 'XVII' => 17, 'XVIII' => 18, 'XIX' => 19, 'XX' => 20,
        ];

        $patterns = [
            '/\bBook\s+(\d+)\b/i' => 'digit',
            '/\bVol(?:ume)?\.?\s*(\d+)\b/i' => 'digit',
            '/\bPart\s+(\d+)\b/i' => 'digit',
            '/\bNo\.?\s*(\d+)\b/i' => 'digit',
            '/#(\d+)\b/' => 'digit',
            '/\bEpisode\s+(\d+)\b/i' => 'digit',
            '/\bStory\s+#?(\d+)\b/i' => 'digit',
            '/\bArc\s+(\d+)\b/i' => 'digit',
            '/\bInstallment\s+(\d+)\b/i' => 'digit',
            '/\bNovel(?:la)?\s+(\d+)\b/i' => 'digit',
            '/\bChapter\s+(\d+)\b/i' => 'digit',
            '/\b(\d+)(?:st|nd|rd|th)\s+(?:Book|Volume|Part|Novel|Installment|Story|Entry)\b/i' => 'digit',
            '/,\s*Book\s*(\d+(?:\.\d+)?)\s*$/i' => 'decimal',
            '/\bBook\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty)\b/i' => 'word',
            '/\bVolume\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\b/i' => 'word',
            '/\bPart\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\b/i' => 'word',
            '/\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth)\s+(?:Book|Volume|Part|Novel|Story)\b/i' => 'word',
            '/\bBook\s+(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)\b/' => 'roman',
            '/\bVolume\s+(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)\b/' => 'roman',
            '/\bPart\s+(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)\b/' => 'roman',
            '/[:\-]\s*(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)$/i' => 'roman',
        ];

        foreach ($patterns as $pattern => $type) {
            if (preg_match($pattern, $text, $matches)) {
                return match ($type) {
                    'digit' => (int) $matches[1],
                    'decimal' => (int) floor((float) $matches[1]),
                    'word' => $numberWords[strtolower($matches[1])] ?? null,
                    'roman' => $romanNumerals[strtoupper($matches[1])] ?? null,
                    default => null,
                };
            }
        }

        return null;
    }

    /**
     * Attempt to infer series name from title structure.
     */
    private function inferSeriesName(string $title, string $subtitle, int $volumeNumber): ?string
    {
        $volumeIndicators = [
            '/\s*[:\-]\s*Book\s+\d+.*/i',
            '/\s*[:\-]\s*Vol(?:ume)?\.?\s*\d+.*/i',
            '/\s*[:\-]\s*Part\s+\d+.*/i',
            '/\s*[:\-]\s*#\d+.*/i',
            '/\s*\bBook\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+)\s*$/i',
            '/\s*\bVolume\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+|[IVX]+)\s*$/i',
            '/\s*[:\-]\s*[IVX]+\s*$/i',
            '/\s*#\d+\s*$/i',
        ];

        $cleanTitle = $title;
        foreach ($volumeIndicators as $pattern) {
            $cleanTitle = preg_replace($pattern, '', $cleanTitle);
        }
        $cleanTitle = trim($cleanTitle, ' :-,');

        if (strlen($cleanTitle) >= 3 && $cleanTitle !== $title) {
            return $cleanTitle;
        }

        if (! empty($subtitle) && strlen($subtitle) > strlen($title)) {
            return null;
        }

        if (preg_match('/^(.+?)\s*[:\-]\s*.+$/', $title, $matches)) {
            $possibleSeries = trim($matches[1]);
            if (strlen($possibleSeries) >= 3) {
                return $possibleSeries;
            }
        }

        return null;
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

    /**
     * Normalize text for consistent pattern matching.
     *
     * Handles em-dashes, en-dashes, curly quotes, and whitespace normalization.
     */
    private function normalizeText(string $text): string
    {
        $text = preg_replace('/[\x{2013}\x{2014}]/u', '-', $text);
        $text = preg_replace('/[\x{201C}\x{201D}\x{201E}]/u', '"', $text);
        $text = preg_replace('/[\x{2018}\x{2019}\x{201A}]/u', "'", $text);
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }

    /**
     * Validate that extracted series info is not a false positive.
     *
     * Checks against known non-series indicators (editions, compilations)
     * and known numeric book titles that shouldn't be treated as series.
     */
    private function isValidSeriesExtraction(
        string $originalTitle,
        ?string $seriesName,
        ?int $volumeNumber
    ): bool {
        if ($seriesName === null || $volumeNumber === null) {
            return false;
        }

        $lowerTitle = strtolower($originalTitle);
        foreach (self::NON_SERIES_INDICATORS as $indicator) {
            if (str_contains($lowerTitle, $indicator)) {
                return false;
            }
        }

        $lowerSeries = strtolower(trim($seriesName));
        foreach (self::NUMERIC_TITLES as $numericTitle) {
            if ($lowerSeries === $numericTitle || str_starts_with($lowerSeries, $numericTitle.' ')) {
                return false;
            }
        }

        if (strlen($seriesName) < 2) {
            return false;
        }

        if ($volumeNumber < 0 || $volumeNumber > 999) {
            return false;
        }

        if (preg_match('/^\d+$/', trim($seriesName))) {
            return false;
        }

        return true;
    }

    /**
     * Execute an ISBN-specific search.
     *
     * Uses the isbn: prefix for precise ISBN lookups. Falls back to
     * a regular search if the ISBN lookup returns no results.
     *
     * @throws BookSearchException
     */
    private function executeIsbnSearch(
        string $isbn,
        int $limit,
        array $baseParams,
        ?string $langRestrict,
        ?array $genres,
        ?float $minRating,
        ?int $yearFrom,
        ?int $yearTo
    ): array {
        $cleaned = preg_replace('/[\s\-]/', '', trim($isbn));
        $isbnQuery = 'isbn:'.$cleaned;
        $timeout = $this->getTimeout();

        $response = $this->executeWithRetry('google-books', function () use ($isbnQuery, $baseParams, $timeout) {
            return Http::timeout($timeout)->get(self::BASE_URL, ['q' => $isbnQuery] + $baseParams);
        });

        if (! $response->successful()) {
            Log::warning('Google Books API: ISBN search failed', [
                'isbn' => $isbn,
                'status' => $response->status(),
            ]);
            $this->recordFailure('google-books');
            throw BookSearchException::serviceUnavailable();
        }

        $this->recordSuccess('google-books');

        $items = $response->json('items', []);
        $totalItems = $response->json('totalItems', 0);

        if (empty($items)) {
            return [
                'items' => [],
                'totalItems' => 0,
                'startIndex' => 0,
                'hasMore' => false,
            ];
        }

        $results = $this->mergeAndRankResults(
            $items,
            [],
            $isbn,
            $limit,
            $langRestrict,
            $genres,
            $minRating,
            $yearFrom,
            $yearTo
        );

        return [
            'items' => $results,
            'totalItems' => $totalItems,
            'startIndex' => 0,
            'hasMore' => false,
        ];
    }
}
