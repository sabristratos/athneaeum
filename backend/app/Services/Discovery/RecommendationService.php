<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use App\Contracts\Discovery\RecommendationServiceInterface;
use App\Contracts\Discovery\UserSignalServiceInterface;
use App\Http\Resources\CatalogBookResource;
use App\Models\CatalogBook;
use App\Models\User;
use App\Models\UserEmbedding;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Book;

/**
 * Service for generating personalized book recommendations.
 *
 * Uses vector similarity for personalization with fallback to
 * popularity-based recommendations for cold-start users.
 */
class RecommendationService implements RecommendationServiceInterface
{
    public function __construct(
        private readonly EmbeddingService $embeddingService,
        private readonly UserSignalServiceInterface $signalService,
    ) {}

    /**
     * Get a personalized discovery feed for the user.
     *
     * Returns trending books for guests, personalized recommendations
     * for authenticated users with reading history.
     */
    public function getPersonalizedFeed(?User $user): array
    {
        $sections = [];
        $preferences = $user ? $this->getUserPreferences($user) : [];
        $hasPersonalization = false;

        if ($user) {
            $vectorResult = $this->computeUserVector($user);

            if ($vectorResult) {
                $hasPersonalization = true;
                $title = $this->formatContributingBooksTitle($vectorResult['contributing_titles']);
                $reason = $title;

                $personalizedBooks = $this->getPersonalizedBooks(
                    $vectorResult['vector'],
                    $preferences,
                    $reason
                );

                if ($personalizedBooks->isNotEmpty()) {
                    $sections[] = [
                        'type' => 'personalized',
                        'title' => $title,
                        'data' => CatalogBookResource::collection($personalizedBooks)->resolve(),
                    ];
                }
            }

            $authorSections = $this->buildAuthorSections($preferences);
            $sections = array_merge($sections, $authorSections);

            $seriesSections = $this->buildSeriesSections($preferences);
            $sections = array_merge($sections, $seriesSections);

            $genreSections = $this->buildGenreSections($user, $preferences);
            $sections = array_merge($sections, $genreSections);
        }

        $trendingBooks = $this->getTrendingBooks($preferences);
        $trendingBooks->each(fn ($book) => $book->recommendation_reason = __('Popular with readers'));

        if ($trendingBooks->isNotEmpty()) {
            $trendingTitle = __('Trending Now');

            if ($user && ! $hasPersonalization) {
                $trendingTitle = __('Popular Books');
            }

            $sections[] = [
                'type' => 'trending',
                'title' => $trendingTitle,
                'subtitle' => $user && ! $hasPersonalization
                    ? __('Read more books to unlock personalized recommendations')
                    : null,
                'data' => CatalogBookResource::collection($trendingBooks)->resolve(),
            ];
        }

        Log::debug('[RecommendationService] Feed generated', [
            'user_id' => $user?->id,
            'sections' => count($sections),
            'personalized' => $hasPersonalization,
        ]);

        return ['sections' => $sections];
    }

    /**
     * Get all user preferences including favorites and exclusions.
     *
     * Returns a comprehensive array with favorite and excluded authors/genres,
     * favorite series, library ISBNs for exclusion, dismissed book IDs,
     * and signal scores for ranking boosts.
     */
    private function getUserPreferences(User $user): array
    {
        $preferences = $user->userPreferences()->get();

        $favoriteAuthors = $preferences
            ->where('category', 'author')
            ->where('type', 'favorite')
            ->pluck('normalized')
            ->toArray();

        $excludedAuthors = $preferences
            ->where('category', 'author')
            ->where('type', 'exclude')
            ->pluck('normalized')
            ->toArray();

        $favoriteGenres = $preferences
            ->where('category', 'genre')
            ->where('type', 'favorite')
            ->pluck('value')
            ->toArray();

        $excludedGenres = $preferences
            ->where('category', 'genre')
            ->where('type', 'exclude')
            ->pluck('normalized')
            ->toArray();

        $favoriteSeries = $preferences
            ->where('category', 'series')
            ->where('type', 'favorite')
            ->pluck('normalized')
            ->toArray();

        $favoriteSeriesNames = $preferences
            ->where('category', 'series')
            ->where('type', 'favorite')
            ->pluck('value')
            ->toArray();

        $favoriteAuthorNames = $preferences
            ->where('category', 'author')
            ->where('type', 'favorite')
            ->pluck('value')
            ->toArray();

        $favoriteFormats = $preferences
            ->where('category', 'format')
            ->where('type', 'favorite')
            ->pluck('value')
            ->toArray();

        $libraryIsbns = $user->userBooks()
            ->with('book:id,isbn,isbn13')
            ->get()
            ->pluck('book')
            ->filter()
            ->flatMap(fn ($book) => array_filter([$book->isbn, $book->isbn13]))
            ->unique()
            ->values()
            ->toArray();

        $dismissedBookIds = $this->signalService->getDismissedBookIds($user);

        $signalScores = $this->signalService->getWeightedSignalScores($user, 200);

        return [
            'favorite_authors' => $favoriteAuthors,
            'favorite_author_names' => $favoriteAuthorNames,
            'excluded_authors' => $excludedAuthors,
            'favorite_genres' => $favoriteGenres,
            'excluded_genres' => $excludedGenres,
            'favorite_series' => $favoriteSeries,
            'favorite_series_names' => $favoriteSeriesNames,
            'favorite_formats' => $favoriteFormats,
            'library_isbns' => $libraryIsbns,
            'dismissed_book_ids' => $dismissedBookIds,
            'signal_scores' => $signalScores,
        ];
    }

    /**
     * Get books similar to a given catalog book using vector similarity.
     * Falls back to genre/author-based matching if no embeddings available.
     */
    public function getSimilarBooks(int $catalogBookId, int $limit = 10): Collection
    {
        $book = CatalogBook::find($catalogBookId);

        if (! $book) {
            return collect();
        }

        if ($book->embedding) {
            if ($book->is_classified) {
                return $this->getSimilarBooksWithClassification($book, $limit);
            }

            return $this->querySimilarBooks($book->embedding, $limit, [$catalogBookId]);
        }

        return $this->getSimilarBooksByGenreAndAuthor($book, $limit);
    }

    /**
     * Fallback similar books query using genre and author matching.
     */
    private function getSimilarBooksByGenreAndAuthor(CatalogBook $book, int $limit = 10): Collection
    {
        $genreIds = $book->genres()->pluck('genres.id')->toArray();
        $query = CatalogBook::where('id', '!=', $book->id);

        if (! empty($genreIds)) {
            $query->whereHas('genres', function ($q) use ($genreIds) {
                $q->whereIn('genres.id', $genreIds);
            });
        }

        if ($book->author) {
            $authorFirstPart = explode(',', $book->author)[0];
            $query->orWhere(function ($q) use ($book, $authorFirstPart) {
                $q->where('id', '!=', $book->id)
                    ->where('author', 'ILIKE', '%' . $authorFirstPart . '%');
            });
        }

        return $query
            ->orderByRaw("(cover_url IS NULL OR cover_url = '')::int ASC")
            ->orderByDesc('popularity_score')
            ->limit($limit)
            ->get();
    }

    /**
     * Search the catalog using semantic similarity.
     *
     * Generates an embedding for the query and finds books with similar content.
     */
    public function semanticSearch(string $query, int $limit = 20): Collection
    {
        if (! $this->embeddingService->isEnabled()) {
            return $this->keywordSearch($query, $limit);
        }

        try {
            $queryEmbedding = $this->embeddingService->generateEmbedding($query);
            $normalizedQuery = $this->embeddingService->normalizeVector($queryEmbedding);

            return $this->querySimilarBooks($normalizedQuery, $limit);
        } catch (\Exception $e) {
            Log::warning('[RecommendationService] Semantic search failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->keywordSearch($query, $limit);
        }
    }

    /**
     * Simple keyword-based search fallback.
     */
    private function keywordSearch(string $query, int $limit): Collection
    {
        return CatalogBook::where('title', 'ILIKE', "%{$query}%")
            ->orWhere('author', 'ILIKE', "%{$query}%")
            ->orderByDesc('popularity_score')
            ->limit($limit)
            ->get();
    }

    /**
     * Get similar books with classification-enhanced ranking.
     *
     * Uses hybrid scoring combining vector similarity (70%) and
     * classification match (30%) for better recommendations.
     */
    public function getSimilarBooksWithClassification(CatalogBook $book, int $limit = 10): Collection
    {
        $candidates = $this->querySimilarBooks($book->embedding, 50, [$book->id]);

        if ($candidates->isEmpty()) {
            return collect();
        }

        $weights = config('discovery.hybrid_weights', [
            'semantic' => 0.7,
            'classification' => 0.3,
        ]);

        $candidates = $candidates->map(function ($candidate) use ($book, $weights) {
            $classificationScore = $this->computeClassificationMatch($book, $candidate);
            $semanticScore = $candidate->similarity ?? 0;

            $candidate->hybrid_score = ($semanticScore * $weights['semantic'])
                + ($classificationScore * $weights['classification']);

            return $candidate;
        });

        return $candidates
            ->sortBy([
                fn ($a, $b) => empty($a->cover_url) <=> empty($b->cover_url),
                fn ($a, $b) => $b->hybrid_score <=> $a->hybrid_score,
            ])
            ->take($limit)
            ->values();
    }

    /**
     * Compute classification match score between two books.
     *
     * Considers mood overlap (Jaccard similarity), intensity match,
     * and audience match with configurable weights.
     */
    private function computeClassificationMatch(CatalogBook $source, CatalogBook $candidate): float
    {
        if (! $source->is_classified || ! $candidate->is_classified) {
            return 0.5;
        }

        $score = 0;

        $sourceMoods = $source->moods ?? [];
        $candidateMoods = $candidate->moods ?? [];

        if (! empty($sourceMoods) && ! empty($candidateMoods)) {
            $intersection = count(array_intersect($sourceMoods, $candidateMoods));
            $union = count(array_unique(array_merge($sourceMoods, $candidateMoods)));
            $score += 0.5 * ($union > 0 ? $intersection / $union : 0);
        }

        if ($source->intensity && $candidate->intensity) {
            if ($source->intensity === $candidate->intensity) {
                $score += 0.3;
            } elseif ($this->isAdjacentIntensity($source->intensity, $candidate->intensity)) {
                $score += 0.15;
            }
        }

        if ($source->audience && $candidate->audience) {
            if ($source->audience === $candidate->audience) {
                $score += 0.2;
            }
        }

        return $score;
    }

    /**
     * Check if two intensity levels are adjacent (e.g., light/moderate).
     */
    private function isAdjacentIntensity(string $a, string $b): bool
    {
        $levels = ['light', 'moderate', 'dark', 'intense'];
        $indexA = array_search($a, $levels);
        $indexB = array_search($b, $levels);

        if ($indexA === false || $indexB === false) {
            return false;
        }

        return abs($indexA - $indexB) === 1;
    }

    /**
     * Compute a user's preference vector from their reading history.
     *
     * Searches through recent read books to find matches in the catalog,
     * then averages their embeddings to create a user preference vector.
     * Returns both the vector and metadata about contributing books.
     *
     * @return array{vector: array, contributing_titles: string[], book_count: int}|null
     */
    public function computeUserVector(User $user): ?array
    {
        $cached = UserEmbedding::where('user_id', $user->id)->first();

        if ($cached && $cached->hasEmbedding() && ! $cached->isStale()) {
            $contributingTitles = $this->getContributingBookTitles($cached->computed_from ?? []);

            return [
                'vector' => $cached->embedding,
                'contributing_titles' => $contributingTitles,
                'book_count' => count($cached->computed_from ?? []),
            ];
        }

        $minMatches = config('discovery.recommendation.min_catalog_matches', 3);
        $maxBooksToSearch = config('discovery.recommendation.max_books_to_search', 100);
        $targetMatches = config('discovery.recommendation.user_books_for_vector', 5);

        $recentBooks = $user->userBooks()
            ->where('status', 'read')
            ->orderByDesc('finished_at')
            ->limit($maxBooksToSearch)
            ->with('book')
            ->get();

        if ($recentBooks->isEmpty()) {
            return null;
        }

        $catalogBooks = $this->findMatchingCatalogBooks($recentBooks->pluck('book')->filter());

        $embeddings = [];
        $bookIds = [];
        $bookTitles = [];

        foreach ($catalogBooks->take($targetMatches) as $catalogBook) {
            if (is_array($catalogBook->embedding) && ! empty($catalogBook->embedding)) {
                $embeddings[] = $catalogBook->embedding;
                $bookIds[] = $catalogBook->id;
                $bookTitles[] = $catalogBook->title;
            }
        }

        if (count($embeddings) < $minMatches) {
            Log::debug('[RecommendationService] Not enough catalog matches', [
                'user_id' => $user->id,
                'matches' => count($embeddings),
                'required' => $minMatches,
            ]);

            return null;
        }

        $userVector = $this->embeddingService->averageVectors($embeddings);
        $this->cacheUserVector($user, $userVector, $bookIds);

        return [
            'vector' => $userVector,
            'contributing_titles' => $bookTitles,
            'book_count' => count($bookIds),
        ];
    }

    /**
     * Get titles for a list of catalog book IDs.
     */
    private function getContributingBookTitles(array $bookIds): array
    {
        if (empty($bookIds)) {
            return [];
        }

        return CatalogBook::whereIn('id', $bookIds)
            ->orderByRaw('array_position(ARRAY[' . implode(',', $bookIds) . ']::int[], id)')
            ->pluck('title')
            ->toArray();
    }

    /**
     * Find matching catalog books for a collection of library books (batched).
     *
     * Uses multiple matching strategies:
     * 1. ISBN13/ISBN exact match
     * 2. Exact title + author match
     * 3. Normalized title (without series info) + author match
     */
    private function findMatchingCatalogBooks(Collection $books): Collection
    {
        if ($books->isEmpty()) {
            return collect();
        }

        $isbn13s = $books->pluck('isbn13')->filter()->unique()->values()->toArray();
        $isbns = $books->pluck('isbn')->filter()->unique()->values()->toArray();

        $titleAuthorPairs = $books->map(fn ($book) => [
            'title' => $book->title,
            'normalized_title' => $this->normalizeTitle($book->title),
            'author' => $book->author,
            'author_first' => explode(',', $book->author ?? '')[0],
        ])->toArray();

        $query = CatalogBook::query()->whereNotNull('embedding');

        $query->where(function ($q) use ($isbn13s, $isbns, $titleAuthorPairs) {
            if (! empty($isbn13s)) {
                $q->orWhereIn('isbn13', $isbn13s);
            }
            if (! empty($isbns)) {
                $q->orWhereIn('isbn', $isbns);
            }
            foreach ($titleAuthorPairs as $pair) {
                $q->orWhere(function ($subQ) use ($pair) {
                    $subQ->where('title', $pair['title'])
                        ->where('author', 'ILIKE', '%'.$pair['author_first'].'%');
                });

                if ($pair['normalized_title'] !== $pair['title'] && strlen($pair['normalized_title']) >= 3) {
                    $q->orWhere(function ($subQ) use ($pair) {
                        $subQ->where('title', 'ILIKE', $pair['normalized_title'].'%')
                            ->where('author', 'ILIKE', '%'.$pair['author_first'].'%');
                    });
                }
            }
        });

        return $query->get();
    }

    /**
     * Normalize a book title for fuzzy matching.
     *
     * Removes series info in parentheses, brackets, colons, etc.
     * "Dune (Dune #1)" becomes "Dune"
     * "The Hobbit, Part One" becomes "The Hobbit"
     */
    private function normalizeTitle(string $title): string
    {
        $normalized = preg_replace('/\s*\([^)]+\)\s*/', '', $title);
        $normalized = preg_replace('/\s*\[[^\]]+\]\s*/', '', $normalized);
        $normalized = preg_replace('/,\s*(Part|Book|Volume|Vol\.?)\s+\w+.*$/i', '', $normalized);
        $normalized = preg_replace('/:\s+.*$/', '', $normalized);
        $normalized = preg_replace('/\s*#\d+.*$/', '', $normalized);

        return trim($normalized);
    }

    /**
     * Refresh a user's cached embedding vector.
     */
    public function refreshUserEmbedding(User $user): void
    {
        UserEmbedding::where('user_id', $user->id)->delete();
        $this->computeUserVector($user);
    }

    /**
     * Get personalized books using vector similarity with preference boosts.
     *
     * Applies score boosts for:
     * - Favorite authors (+25%)
     * - Favorite series (+20%)
     * - Favorite format (+10%)
     * - Positive signals (+15%)
     *
     * Each book gets a context-aware recommendation reason based on what matched.
     */
    private function getPersonalizedBooks(array $userVector, array $preferences = [], ?string $fallbackReason = null): Collection
    {
        $fetchLimit = config('discovery.recommendation.personalized_limit', 20) * 2;
        $returnLimit = config('discovery.recommendation.personalized_limit', 20);

        $books = $this->querySimilarBooks($userVector, $fetchLimit, [], $preferences);

        $boosts = config('discovery.preference_boosts', [
            'favorite_author' => 1.25,
            'favorite_series' => 1.20,
            'favorite_format' => 1.10,
            'positive_signal' => 1.15,
        ]);

        $books = $books->map(function ($book) use ($preferences, $boosts, $fallbackReason) {
            $book->boosted_score = $book->similarity ?? $book->popularity_score ?? 0;

            if ($this->matchesFavoriteAuthor($book, $preferences)) {
                $book->boosted_score *= $boosts['favorite_author'];
            }

            if ($this->matchesFavoriteSeries($book, $preferences)) {
                $book->boosted_score *= $boosts['favorite_series'];
            }

            if ($this->matchesFavoriteFormat($book, $preferences)) {
                $book->boosted_score *= $boosts['favorite_format'];
            }

            $signalScore = $preferences['signal_scores'][$book->id] ?? 0;
            if ($signalScore > 0) {
                $book->boosted_score *= $boosts['positive_signal'];
            }

            $book->recommendation_reason = $this->getRecommendationReason($book, $preferences, $fallbackReason);

            return $book;
        });

        return $books->sortByDesc('boosted_score')->take($returnLimit)->values();
    }

    /**
     * Get a context-aware recommendation reason for a book.
     *
     * Priority order:
     * 1. Favorite author match
     * 2. Favorite series match
     * 3. Previous positive interaction (signal)
     * 4. Favorite genre match
     * 5. Default reading history reason
     */
    private function getRecommendationReason(CatalogBook $book, array $preferences, ?string $fallbackReason = null): string
    {
        $matchedAuthor = $this->getMatchedFavoriteAuthor($book, $preferences);
        if ($matchedAuthor) {
            return __('By :author, one of your favorites', ['author' => $book->author ?? $matchedAuthor]);
        }

        $matchedSeries = $this->getMatchedFavoriteSeries($book, $preferences);
        if ($matchedSeries) {
            return __('From :series, a series you follow', ['series' => $book->series ?? $matchedSeries]);
        }

        $signalScore = $preferences['signal_scores'][$book->id] ?? 0;
        if ($signalScore > 0.5) {
            return __('You showed interest in this before');
        }

        $matchedGenre = $this->getMatchedFavoriteGenre($book, $preferences);
        if ($matchedGenre) {
            return __('Because you like :genre', ['genre' => strtolower($matchedGenre)]);
        }

        return $fallbackReason ?? __('Similar to books you\'ve read');
    }

    /**
     * Check if a book matches a favorite author.
     */
    private function matchesFavoriteAuthor(CatalogBook $book, array $preferences): bool
    {
        return $this->getMatchedFavoriteAuthor($book, $preferences) !== null;
    }

    /**
     * Get the matched favorite author name, or null if no match.
     */
    private function getMatchedFavoriteAuthor(CatalogBook $book, array $preferences): ?string
    {
        $favoriteAuthors = $preferences['favorite_authors'] ?? [];
        $favoriteAuthorNames = $preferences['favorite_author_names'] ?? [];

        if (empty($favoriteAuthors)) {
            return null;
        }

        $bookAuthor = strtolower($book->author ?? '');
        foreach ($favoriteAuthors as $index => $author) {
            if (str_contains($bookAuthor, $author)) {
                return $favoriteAuthorNames[$index] ?? ucfirst($author);
            }
        }

        return null;
    }

    /**
     * Check if a book matches a favorite series.
     */
    private function matchesFavoriteSeries(CatalogBook $book, array $preferences): bool
    {
        return $this->getMatchedFavoriteSeries($book, $preferences) !== null;
    }

    /**
     * Get the matched favorite series name, or null if no match.
     */
    private function getMatchedFavoriteSeries(CatalogBook $book, array $preferences): ?string
    {
        $favoriteSeries = $preferences['favorite_series'] ?? [];
        if (empty($favoriteSeries)) {
            return null;
        }

        $bookSeries = strtolower($book->series ?? '');
        if (empty($bookSeries)) {
            return null;
        }

        foreach ($favoriteSeries as $series) {
            if (str_contains($bookSeries, $series)) {
                return $book->series ?? ucfirst($series);
            }
        }

        return null;
    }

    /**
     * Get the matched favorite genre, or null if no match.
     */
    private function getMatchedFavoriteGenre(CatalogBook $book, array $preferences): ?string
    {
        $favoriteGenres = $preferences['favorite_genres'] ?? [];
        if (empty($favoriteGenres)) {
            return null;
        }

        $bookGenres = $book->genres ?? [];
        if (empty($bookGenres)) {
            return null;
        }

        foreach ($favoriteGenres as $genre) {
            $normalizedGenre = strtolower($genre);
            foreach ($bookGenres as $bookGenre) {
                if (strtolower($bookGenre) === $normalizedGenre) {
                    return $genre;
                }
            }
        }

        return null;
    }

    /**
     * Check if a book matches a favorite format.
     */
    private function matchesFavoriteFormat(CatalogBook $book, array $preferences): bool
    {
        $favoriteFormats = $preferences['favorite_formats'] ?? [];
        if (empty($favoriteFormats)) {
            return false;
        }

        $bookFormat = strtolower($book->format ?? '');
        if (empty($bookFormat)) {
            return false;
        }

        foreach ($favoriteFormats as $format) {
            if (strtolower($format) === $bookFormat) {
                return true;
            }
        }

        return false;
    }

    /**
     * Query similar books using pgvector cosine distance.
     */
    private function querySimilarBooks(array $vector, int $limit, array $excludeIds = [], array $exclusions = []): Collection
    {
        $query = CatalogBook::query();

        if (config('database.default') !== 'pgsql') {
            $query->popular();
        } else {
            $vectorString = '['.implode(',', $vector).']';

            $query->selectRaw('*, 1 - (embedding <=> ?) as similarity', [$vectorString])
                ->whereNotNull('embedding')
                ->orderByRaw("(cover_url IS NULL OR cover_url = '')::int ASC")
                ->orderByRaw('embedding <=> ?', [$vectorString])
                ->orderByDesc('popularity_score');
        }

        $query->whereNotIn('id', $excludeIds);
        $this->applyExclusions($query, $exclusions);

        return $query->limit($limit)->get();
    }

    /**
     * Apply user exclusions (authors, genres, library books, dismissed books) to a query.
     *
     * Accepts either the old exclusion format or new preferences format.
     */
    private function applyExclusions($query, array $preferences): void
    {
        if (empty($preferences)) {
            return;
        }

        $excludedAuthors = $preferences['excluded_authors'] ?? $preferences['authors'] ?? [];
        $excludedGenres = $preferences['excluded_genres'] ?? $preferences['genres'] ?? [];
        $libraryIsbns = $preferences['library_isbns'] ?? [];
        $dismissedBookIds = $preferences['dismissed_book_ids'] ?? [];

        if (! empty($excludedAuthors)) {
            $query->where(function ($q) use ($excludedAuthors) {
                foreach ($excludedAuthors as $author) {
                    $q->whereRaw('LOWER(author) NOT LIKE ?', ['%'.$author.'%']);
                }
            });
        }

        if (! empty($excludedGenres)) {
            foreach ($excludedGenres as $genre) {
                $query->whereRaw("NOT (genres @> ?)", [json_encode([$genre])]);
            }
        }

        if (! empty($libraryIsbns)) {
            $query->where(function ($q) use ($libraryIsbns) {
                $q->whereNull('isbn')
                    ->orWhere('isbn', '')
                    ->orWhereNotIn('isbn', $libraryIsbns);
            })
            ->where(function ($q) use ($libraryIsbns) {
                $q->whereNull('isbn13')
                    ->orWhere('isbn13', '')
                    ->orWhereNotIn('isbn13', $libraryIsbns);
            });
        }

        if (! empty($dismissedBookIds)) {
            $query->whereNotIn('id', $dismissedBookIds);
        }
    }

    /**
     * Get trending books by popularity score.
     */
    private function getTrendingBooks(array $exclusions = []): Collection
    {
        $limit = config('discovery.recommendation.trending_limit', 20);

        $query = CatalogBook::popular();
        $this->applyExclusions($query, $exclusions);

        return $query->limit($limit)->get();
    }

    /**
     * Build "From Authors You Love" sections for favorite authors.
     */
    private function buildAuthorSections(array $preferences): array
    {
        $sections = [];

        $favoriteAuthorNames = $preferences['favorite_author_names'] ?? [];
        if (empty($favoriteAuthorNames)) {
            return $sections;
        }

        $limit = config('discovery.feed_sections.author_section_limit', 15);
        $maxSections = config('discovery.feed_sections.max_author_sections', 2);

        $authorCount = 0;
        foreach ($favoriteAuthorNames as $authorName) {
            if ($authorCount >= $maxSections) {
                break;
            }

            $query = CatalogBook::where('author', 'ILIKE', '%'.$authorName.'%')
                ->popular();

            $this->applyExclusions($query, $preferences);

            $books = $query->limit($limit)->get();

            if ($books->isNotEmpty()) {
                $reason = __("You love :author", ['author' => $authorName]);
                $books->each(fn ($book) => $book->recommendation_reason = $reason);

                $sections[] = [
                    'type' => 'author',
                    'title' => __('From :author', ['author' => $authorName]),
                    'data' => CatalogBookResource::collection($books)->resolve(),
                ];

                $authorCount++;
            }
        }

        return $sections;
    }

    /**
     * Build sections for favorite series.
     */
    private function buildSeriesSections(array $preferences): array
    {
        $sections = [];

        $favoriteSeriesNames = $preferences['favorite_series_names'] ?? [];
        $favoriteSeries = $preferences['favorite_series'] ?? [];

        if (empty($favoriteSeriesNames)) {
            return $sections;
        }

        $limit = config('discovery.feed_sections.series_section_limit', 10);
        $maxSections = config('discovery.feed_sections.max_series_sections', 2);

        $seriesCount = 0;
        foreach ($favoriteSeriesNames as $index => $seriesName) {
            if ($seriesCount >= $maxSections) {
                break;
            }

            $normalizedSeries = $favoriteSeries[$index] ?? strtolower($seriesName);

            $query = CatalogBook::where('series', 'ILIKE', '%'.$seriesName.'%')
                ->orderBy('series_position')
                ->orderByDesc('popularity_score');

            $this->applyExclusions($query, $preferences);

            $books = $query->limit($limit)->get();

            if ($books->isNotEmpty()) {
                $reason = __('From a series you follow');
                $books->each(fn ($book) => $book->recommendation_reason = $reason);

                $sections[] = [
                    'type' => 'series',
                    'title' => $seriesName,
                    'data' => CatalogBookResource::collection($books)->resolve(),
                ];

                $seriesCount++;
            }
        }

        return $sections;
    }

    /**
     * Build genre-based recommendation sections from user preferences.
     */
    private function buildGenreSections(User $user, array $preferences = []): array
    {
        $sections = [];

        $favoriteGenres = $preferences['favorite_genres'] ?? [];
        if (empty($favoriteGenres)) {
            return $sections;
        }

        $genresToShow = array_slice($favoriteGenres, 0, 3);
        $limit = config('discovery.recommendation.genre_section_limit', 15);

        foreach ($genresToShow as $genre) {
            $query = CatalogBook::whereRaw("genres @> ?", [json_encode([$genre])])
                ->popular();

            $this->applyExclusions($query, $preferences);

            $books = $query->limit($limit)->get();

            if ($books->isNotEmpty()) {
                $reason = __("You like :genre", ['genre' => strtolower($genre)]);
                $books->each(fn ($book) => $book->recommendation_reason = $reason);

                $sections[] = [
                    'type' => 'genre',
                    'title' => __(':genre for You', ['genre' => ucfirst($genre)]),
                    'data' => CatalogBookResource::collection($books)->resolve(),
                ];
            }
        }

        return $sections;
    }

    /**
     * Format a section title from contributing book titles.
     *
     * Examples:
     * - 1 book: "Based on Dune"
     * - 2 books: "Based on Dune and The Hobbit"
     * - 3+ books: "Based on Dune, The Hobbit, and 3 others"
     */
    private function formatContributingBooksTitle(array $titles): string
    {
        if (empty($titles)) {
            return __('Recommended for You');
        }

        $count = count($titles);

        if ($count === 1) {
            return __("Based on :title", ['title' => $titles[0]]);
        }

        if ($count === 2) {
            return __("Based on :first and :second", [
                'first' => $titles[0],
                'second' => $titles[1],
            ]);
        }

        $othersCount = $count - 2;

        return __("Based on :first, :second, and :count others", [
            'first' => $titles[0],
            'second' => $titles[1],
            'count' => $othersCount,
        ]);
    }

    /**
     * Cache a user's computed vector.
     */
    private function cacheUserVector(User $user, array $vector, array $bookIds): void
    {
        try {
            UserEmbedding::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'embedding' => $vector,
                    'computed_from' => $bookIds,
                    'computed_at' => now(),
                ]
            );
        } catch (\Exception $e) {
            Log::warning('[RecommendationService] Failed to cache user vector', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
