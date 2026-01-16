<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use App\Contracts\AuthorResolverInterface;
use App\Contracts\Discovery\BookResolutionServiceInterface;
use App\Contracts\GenreMapperInterface;
use App\Jobs\EnrichMasterBookJob;
use App\Models\MasterBook;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Service for resolving books with minimal external API calls.
 *
 * Checks local database first before hitting external APIs,
 * building a proprietary book database over time.
 */
class BookResolutionService implements BookResolutionServiceInterface
{
    private const FUZZY_MATCH_THRESHOLD = 0.85;

    private const MIN_LOCAL_COVERAGE = 10;

    public function __construct(
        private readonly AuthorResolverInterface $authorResolver,
        private readonly GenreMapperInterface $genreMapper
    ) {}

    /**
     * Resolve a book from search result data, using local cache first.
     */
    public function resolve(array $searchResult): MasterBook
    {
        $existing = $this->findExisting(
            isbn13: $this->extractIsbn13($searchResult),
            isbn10: $searchResult['isbn10'] ?? null,
            googleBooksId: $searchResult['external_id'] ?? $searchResult['google_books_id'] ?? null,
            openLibraryKey: $searchResult['open_library_key'] ?? null,
            title: $searchResult['title'] ?? null,
            author: $searchResult['author'] ?? null
        );

        if ($existing) {
            Log::debug('[BookResolution] Found existing book', [
                'master_book_id' => $existing->id,
                'title' => $existing->title,
            ]);

            return $existing;
        }

        return $this->create($searchResult, queueEnrichment: true);
    }

    /**
     * Find an existing book by various identifiers.
     */
    public function findExisting(
        ?string $isbn13 = null,
        ?string $isbn10 = null,
        ?string $googleBooksId = null,
        ?string $openLibraryKey = null,
        ?string $title = null,
        ?string $author = null
    ): ?MasterBook {
        // Priority 1: ISBN-13 exact match (most reliable)
        if ($isbn13) {
            $book = MasterBook::where('isbn13', $isbn13)->first();
            if ($book) {
                return $book;
            }
        }

        // Priority 2: ISBN-10 exact match
        if ($isbn10) {
            $book = MasterBook::where('isbn10', $isbn10)->first();
            if ($book) {
                return $book;
            }
        }

        // Priority 3: Google Books ID exact match
        if ($googleBooksId) {
            $book = MasterBook::where('google_books_id', $googleBooksId)->first();
            if ($book) {
                return $book;
            }
        }

        // Priority 4: Open Library key exact match
        if ($openLibraryKey) {
            $book = MasterBook::where('open_library_key', $openLibraryKey)->first();
            if ($book) {
                return $book;
            }
        }

        // Priority 5: Title + Author fuzzy match (fallback)
        if ($title && $author) {
            $book = $this->findByTitleAuthorFuzzy($title, $author);
            if ($book) {
                return $book;
            }
        }

        return null;
    }

    /**
     * Find a book by title and author using fuzzy matching.
     */
    private function findByTitleAuthorFuzzy(string $title, string $author): ?MasterBook
    {
        $normalizedTitle = $this->normalizeForMatching($title);
        $normalizedAuthor = $this->normalizeForMatching($author);

        // First, try exact normalized match
        $candidates = MasterBook::query()
            ->whereRaw('LOWER(title) = ?', [strtolower($title)])
            ->orWhereRaw('LOWER(title) LIKE ?', ['%'.strtolower($title).'%'])
            ->limit(50)
            ->get();

        foreach ($candidates as $candidate) {
            $candidateTitle = $this->normalizeForMatching($candidate->title);
            $candidateAuthor = $this->normalizeForMatching($candidate->author ?? '');

            $titleSimilarity = $this->calculateSimilarity($normalizedTitle, $candidateTitle);
            $authorSimilarity = $this->calculateSimilarity($normalizedAuthor, $candidateAuthor);

            // Both title and author must meet threshold
            if ($titleSimilarity >= self::FUZZY_MATCH_THRESHOLD
                && $authorSimilarity >= self::FUZZY_MATCH_THRESHOLD) {
                Log::debug('[BookResolution] Fuzzy match found', [
                    'input_title' => $title,
                    'input_author' => $author,
                    'matched_title' => $candidate->title,
                    'matched_author' => $candidate->author,
                    'title_similarity' => $titleSimilarity,
                    'author_similarity' => $authorSimilarity,
                ]);

                return $candidate;
            }
        }

        return null;
    }

    /**
     * Normalize a string for fuzzy matching.
     */
    private function normalizeForMatching(string $text): string
    {
        $text = Str::lower($text);
        $text = preg_replace('/[^a-z0-9\s]/', '', $text);
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }

    /**
     * Calculate similarity between two strings (0-1).
     */
    private function calculateSimilarity(string $a, string $b): float
    {
        if ($a === $b) {
            return 1.0;
        }

        if (empty($a) || empty($b)) {
            return 0.0;
        }

        similar_text($a, $b, $percent);

        return $percent / 100;
    }

    /**
     * Check if a search query can be satisfied locally.
     */
    public function canResolveLocally(string $query): bool
    {
        $count = $this->searchLocal($query, self::MIN_LOCAL_COVERAGE)->count();

        return $count >= self::MIN_LOCAL_COVERAGE;
    }

    /**
     * Search the master_books table directly.
     */
    public function searchLocal(string $query, int $limit = 20): Collection
    {
        $query = trim($query);

        if (empty($query)) {
            return collect();
        }

        // Split query into words for better matching
        $words = preg_split('/\s+/', $query);
        $searchPattern = '%'.implode('%', $words).'%';

        return MasterBook::query()
            ->where(function ($q) use ($query, $searchPattern) {
                // Exact phrase match (highest priority)
                $q->where('title', 'ILIKE', '%'.$query.'%')
                    ->orWhere('author', 'ILIKE', '%'.$query.'%')
                    // Word-based match
                    ->orWhere('title', 'ILIKE', $searchPattern)
                    ->orWhere('author', 'ILIKE', $searchPattern);
            })
            ->orderByRaw("
                CASE
                    WHEN LOWER(title) = LOWER(?) THEN 1
                    WHEN LOWER(title) LIKE LOWER(?) THEN 2
                    WHEN LOWER(author) LIKE LOWER(?) THEN 3
                    ELSE 4
                END
            ", [$query, $query.'%', $query.'%'])
            ->orderByDesc('user_count')
            ->orderByDesc('popularity_score')
            ->limit($limit)
            ->get();
    }

    /**
     * Create a new master book from search result data.
     */
    public function create(array $data, bool $queueEnrichment = true): MasterBook
    {
        $isbn13 = $this->extractIsbn13($data);
        $source = $this->determineSource($data);

        $book = MasterBook::create([
            'isbn13' => $isbn13,
            'isbn10' => $data['isbn10'] ?? $this->extractIsbn10($data),
            'title' => $data['title'],
            'subtitle' => $data['subtitle'] ?? null,
            'author' => $data['author'] ?? null,
            'description' => $data['description'] ?? null,
            'page_count' => $data['page_count'] ?? null,
            'published_date' => $this->parseDate($data['published_date'] ?? null),
            'publisher' => $data['publisher'] ?? null,
            'language' => $data['language'] ?? 'en',
            'genres' => $data['genres'] ?? null,
            'subjects' => $data['subjects'] ?? null,
            'series_name' => $data['series_name'] ?? $data['series'] ?? null,
            'series_position' => $data['series_position'] ?? $data['volume_number'] ?? null,
            'cover_url_external' => $data['cover_url'] ?? null,
            'google_books_id' => $data['external_id'] ?? $data['google_books_id'] ?? null,
            'open_library_key' => $data['open_library_key'] ?? null,
            'goodreads_id' => $data['goodreads_id'] ?? null,
            'data_sources' => [$source],
            'popularity_score' => $this->calculatePopularityScore($data),
            'review_count' => $data['review_count'] ?? $data['ratings_count'] ?? 0,
            'average_rating' => $data['average_rating'] ?? null,
            'user_count' => 1,
        ]);

        $this->linkAuthors($book, $data['author'] ?? null);
        $this->linkGenres($book, $data['genres'] ?? [], $source);

        $book->completeness_score = $book->calculateCompleteness();
        $book->save();

        Log::info('[BookResolution] Created new master book', [
            'id' => $book->id,
            'title' => $book->title,
            'isbn13' => $book->isbn13,
            'completeness' => $book->completeness_score,
            'author_count' => $book->authors()->count(),
            'genre_count' => $book->genres()->count(),
        ]);

        if ($queueEnrichment && $book->needsEnrichment()) {
            EnrichMasterBookJob::dispatch($book->id)->delay(now()->addSeconds(5));
        }

        return $book;
    }

    /**
     * Resolve and link authors to a master book.
     */
    private function linkAuthors(MasterBook $book, ?string $authorString): void
    {
        if (empty($authorString)) {
            return;
        }

        try {
            $authors = $this->authorResolver->resolve($authorString);
            $position = 1;

            foreach ($authors as $author) {
                $book->authors()->syncWithoutDetaching([
                    $author->id => ['position' => $position++],
                ]);
            }

            Log::debug('[BookResolution] Linked authors', [
                'book_id' => $book->id,
                'author_count' => count($authors),
            ]);
        } catch (\Exception $e) {
            Log::warning('[BookResolution] Failed to link authors', [
                'book_id' => $book->id,
                'author_string' => $authorString,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Map and link genres to a master book.
     */
    private function linkGenres(MasterBook $book, array $rawGenres, string $source): void
    {
        if (empty($rawGenres)) {
            return;
        }

        try {
            $result = $this->genreMapper->map($rawGenres, $source);
            $genres = $result['genres'] ?? [];

            foreach ($genres as $index => $genre) {
                $book->genres()->syncWithoutDetaching([
                    $genre->id => ['is_primary' => $index === 0],
                ]);
            }

            Log::debug('[BookResolution] Linked genres', [
                'book_id' => $book->id,
                'genre_count' => count($genres),
                'unmapped' => $result['unmapped'] ?? [],
            ]);
        } catch (\Exception $e) {
            Log::warning('[BookResolution] Failed to link genres', [
                'book_id' => $book->id,
                'raw_genres' => $rawGenres,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Increment user count for a book (when user adds to library).
     */
    public function incrementUserCount(MasterBook $book): void
    {
        $book->increment('user_count');

        // If popular enough and not embedded, queue enrichment
        if ($book->user_count >= 2 && ! $book->is_embedded) {
            EnrichMasterBookJob::dispatch($book->id)->delay(now()->addSeconds(10));
        }
    }

    /**
     * Get statistics about local book coverage.
     */
    public function getCoverageStats(): array
    {
        return [
            'total' => MasterBook::count(),
            'with_covers' => MasterBook::whereNotNull('cover_path')->count(),
            'with_external_covers' => MasterBook::whereNotNull('cover_url_external')->count(),
            'with_embeddings' => MasterBook::where('is_embedded', true)->count(),
            'classified' => MasterBook::where('is_classified', true)->count(),
            'with_description' => MasterBook::whereNotNull('description')
                ->where('description', '!=', '')
                ->count(),
            'popular' => MasterBook::where('user_count', '>=', 2)->count(),
            'avg_completeness' => round(MasterBook::avg('completeness_score') ?? 0, 2),
        ];
    }

    /**
     * Extract ISBN-13 from various data formats.
     */
    private function extractIsbn13(array $data): ?string
    {
        // Try direct isbn13 field
        if (! empty($data['isbn13'])) {
            return $this->cleanIsbn($data['isbn13']);
        }

        // Try isbn field (might be 13 or 10)
        if (! empty($data['isbn'])) {
            $isbn = $this->cleanIsbn($data['isbn']);
            if (strlen($isbn) === 13) {
                return $isbn;
            }
        }

        return null;
    }

    /**
     * Extract ISBN-10 from various data formats.
     */
    private function extractIsbn10(array $data): ?string
    {
        if (! empty($data['isbn10'])) {
            return $this->cleanIsbn($data['isbn10']);
        }

        if (! empty($data['isbn'])) {
            $isbn = $this->cleanIsbn($data['isbn']);
            if (strlen($isbn) === 10) {
                return $isbn;
            }
        }

        return null;
    }

    /**
     * Clean an ISBN string.
     */
    private function cleanIsbn(string $isbn): string
    {
        return preg_replace('/[^0-9X]/', '', strtoupper($isbn));
    }

    /**
     * Parse a date string into a Carbon date.
     */
    private function parseDate(?string $date): ?\Carbon\Carbon
    {
        if (empty($date)) {
            return null;
        }

        try {
            // Handle year-only dates
            if (preg_match('/^\d{4}$/', $date)) {
                return \Carbon\Carbon::createFromFormat('Y', $date)->startOfYear();
            }

            // Handle year-month dates
            if (preg_match('/^\d{4}-\d{2}$/', $date)) {
                return \Carbon\Carbon::createFromFormat('Y-m', $date)->startOfMonth();
            }

            return \Carbon\Carbon::parse($date);
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Determine the data source based on available identifiers.
     */
    private function determineSource(array $data): string
    {
        if (! empty($data['external_provider'])) {
            return $data['external_provider'];
        }

        if (! empty($data['google_books_id']) || ! empty($data['external_id'])) {
            return 'google_books';
        }

        if (! empty($data['open_library_key'])) {
            return 'open_library';
        }

        if (! empty($data['goodreads_id'])) {
            return 'goodreads';
        }

        return 'user_submitted';
    }

    /**
     * Calculate popularity score from ratings data.
     */
    private function calculatePopularityScore(array $data): float
    {
        $rating = $data['average_rating'] ?? 0;
        $reviewCount = $data['review_count'] ?? $data['ratings_count'] ?? 0;

        if ($reviewCount <= 0) {
            return 0;
        }

        // Formula: rating * log(reviews + 1)
        return round($rating * log($reviewCount + 1), 4);
    }
}
