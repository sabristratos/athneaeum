<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Authors\AuthorNormalizer;
use App\Services\Authors\OpenLibraryAuthorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Controller for author-related operations.
 *
 * Provides endpoints for:
 * - Aggregating authors from user's library
 * - Searching authors via OpenLibrary
 * - Getting author details and works
 */
class AuthorController extends Controller
{
    private const LIBRARY_CACHE_TTL_MINUTES = 30;

    public function __construct(
        private OpenLibraryAuthorService $openLibraryService,
        private AuthorNormalizer $normalizer
    ) {}

    /**
     * Get all authors from the user's library with statistics.
     */
    public function library(Request $request): JsonResponse
    {
        $request->validate([
            'filter' => ['nullable', 'string', 'in:all,favorites,excluded'],
            'sort' => ['nullable', 'string', 'in:books,name,rating,pages'],
            'order' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $user = $request->user();
        $filter = $request->input('filter', 'all');
        $sortBy = $request->input('sort', 'books');
        $sortOrder = $request->input('order', 'desc');
        $cacheKey = "user.{$user->id}.library_authors";

        $authors = Cache::remember($cacheKey, now()->addMinutes(self::LIBRARY_CACHE_TTL_MINUTES), function () use ($user) {
            return $this->aggregateLibraryAuthors($user->id);
        });

        $favoriteAuthors = $user->favoriteAuthors()->pluck('normalized')->toArray();
        $excludedAuthors = $user->excludedAuthors()->pluck('normalized')->toArray();

        $authors = array_map(function ($author) use ($favoriteAuthors, $excludedAuthors) {
            $author['is_favorite'] = in_array($author['normalized'], $favoriteAuthors, true);
            $author['is_excluded'] = in_array($author['normalized'], $excludedAuthors, true);

            return $author;
        }, $authors);

        if ($filter === 'favorites') {
            $authors = array_filter($authors, fn ($a) => $a['is_favorite']);
        } elseif ($filter === 'excluded') {
            $authors = array_filter($authors, fn ($a) => $a['is_excluded']);
        }

        $authors = array_values($authors);

        usort($authors, function ($a, $b) use ($sortBy, $sortOrder) {
            $result = match ($sortBy) {
                'name' => strcasecmp($a['name'], $b['name']),
                'rating' => ($a['avg_rating'] ?? 0) <=> ($b['avg_rating'] ?? 0),
                'pages' => $a['total_pages'] <=> $b['total_pages'],
                default => $a['book_count'] <=> $b['book_count'],
            };

            return $sortOrder === 'desc' ? -$result : $result;
        });

        return response()->json($authors);
    }

    /**
     * Search for authors via OpenLibrary.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $results = $this->openLibraryService->searchAuthors(
            $request->input('q'),
            (int) $request->input('limit', 20),
            (int) $request->input('offset', 0)
        );

        return response()->json($results);
    }

    /**
     * Get author details from OpenLibrary.
     */
    public function show(string $key): JsonResponse
    {
        $author = $this->openLibraryService->getAuthor($key);

        if (! $author) {
            return response()->json(['message' => 'Author not found'], 404);
        }

        return response()->json($author);
    }

    /**
     * Get author's works from OpenLibrary.
     */
    public function works(Request $request, string $key): JsonResponse
    {
        $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'offset' => ['nullable', 'integer', 'min:0'],
        ]);

        $works = $this->openLibraryService->getAuthorWorks(
            $key,
            (int) $request->input('limit', 20),
            (int) $request->input('offset', 0)
        );

        return response()->json($works);
    }

    /**
     * Aggregate authors from user's library with stats.
     *
     * @return array<int, array{name: string, normalized: string, book_count: int, avg_rating: float|null, total_pages: int}>
     */
    private function aggregateLibraryAuthors(int $userId): array
    {
        $authorStrings = DB::table('user_books')
            ->join('books', 'user_books.book_id', '=', 'books.id')
            ->where('user_books.user_id', $userId)
            ->select([
                'books.author',
                'books.page_count',
                'user_books.rating',
            ])
            ->get();

        $authorStats = [];

        foreach ($authorStrings as $row) {
            $authors = $this->normalizer->parseAuthors($row->author);

            foreach ($authors as $authorName) {
                $normalized = $this->normalizer->slugify($authorName);

                if (! isset($authorStats[$normalized])) {
                    $authorStats[$normalized] = [
                        'name' => $authorName,
                        'normalized' => $normalized,
                        'book_count' => 0,
                        'total_pages' => 0,
                        'ratings' => [],
                    ];
                }

                $authorStats[$normalized]['book_count']++;
                $authorStats[$normalized]['total_pages'] += (int) ($row->page_count ?? 0);

                if ($row->rating !== null) {
                    $authorStats[$normalized]['ratings'][] = (float) $row->rating;
                }
            }
        }

        $results = [];
        foreach ($authorStats as $stat) {
            $avgRating = null;
            if (! empty($stat['ratings'])) {
                $avgRating = round(array_sum($stat['ratings']) / count($stat['ratings']), 1);
            }

            $results[] = [
                'name' => $stat['name'],
                'normalized' => $stat['normalized'],
                'book_count' => $stat['book_count'],
                'avg_rating' => $avgRating,
                'total_pages' => $stat['total_pages'],
            ];
        }

        usort($results, fn ($a, $b) => $b['book_count'] <=> $a['book_count']);

        return $results;
    }
}
