<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\Discovery\RecommendationServiceInterface;
use App\Contracts\Discovery\UserSignalServiceInterface;
use App\Http\Controllers\Controller;
use App\Http\Resources\CatalogBookResource;
use App\Models\CatalogBook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Controller for discovery and recommendation endpoints.
 *
 * Handles personalized feed generation, similar book queries,
 * and user signal recording.
 */
class DiscoveryController extends Controller
{
    public function __construct(
        private readonly RecommendationServiceInterface $recommendationService,
        private readonly UserSignalServiceInterface $signalService,
    ) {}

    /**
     * Get the discovery feed.
     *
     * Returns personalized recommendations for authenticated users,
     * or trending/popular books for guests.
     */
    public function feed(Request $request): JsonResponse
    {
        $user = auth('sanctum')->user();
        $userId = $user?->id;
        Log::info('[Discovery] Feed requested', [
            'user_id' => $userId,
            'is_authenticated' => $user !== null,
        ]);

        try {
            $feed = $this->recommendationService->getPersonalizedFeed($user);

            Log::info('[Discovery] Feed generated successfully', [
                'user_id' => $userId,
                'section_count' => count($feed['sections'] ?? []),
                'sections' => collect($feed['sections'] ?? [])->map(fn ($s) => [
                    'type' => $s['type'] ?? 'unknown',
                    'title' => $s['title'] ?? 'unknown',
                    'book_count' => count($s['data'] ?? []),
                ])->toArray(),
            ]);

            return response()->json($feed);
        } catch (\Exception $e) {
            Log::error('[Discovery] Feed generation failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $fallbackBooks = CatalogBook::popular()->limit(20)->get();
            Log::info('[Discovery] Returning fallback feed', [
                'fallback_book_count' => $fallbackBooks->count(),
            ]);

            return response()->json([
                'sections' => [
                    [
                        'type' => 'trending',
                        'title' => __('Popular Books'),
                        'data' => CatalogBookResource::collection($fallbackBooks)->resolve(),
                    ],
                ],
            ]);
        }
    }

    /**
     * Record user interaction signals (views, clicks, etc.).
     */
    public function recordSignals(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'signals' => 'required|array|min:1|max:100',
            'signals.*.book_id' => 'required|integer|exists:catalog_books,id',
            'signals.*.type' => 'required|string|in:view,click,add_to_library,dismiss',
        ]);

        Log::info('[Discovery] Recording signals', [
            'user_id' => $request->user()?->id,
            'signal_count' => count($validated['signals']),
            'signals' => $validated['signals'],
        ]);

        $this->signalService->recordSignals($request->user(), $validated['signals']);

        return response()->json(['success' => true]);
    }

    /**
     * Get books similar to a given catalog book.
     */
    public function similar(CatalogBook $catalogBook): JsonResponse
    {
        Log::info('[Discovery] Similar books requested', [
            'catalog_book_id' => $catalogBook->id,
            'book_title' => $catalogBook->title,
            'book_author' => $catalogBook->author,
            'has_embedding' => $catalogBook->embedding !== null,
            'is_classified' => $catalogBook->is_classified,
            'genre_count' => $catalogBook->genres()->count(),
        ]);

        try {
            $similar = $this->recommendationService->getSimilarBooks($catalogBook->id);

            Log::info('[Discovery] Similar books found', [
                'catalog_book_id' => $catalogBook->id,
                'similar_count' => $similar->count(),
                'similar_books' => $similar->take(5)->map(fn ($b) => [
                    'id' => $b->id,
                    'title' => $b->title,
                    'has_cover' => $b->cover_url !== null,
                ])->toArray(),
            ]);

            return response()->json([
                'data' => CatalogBookResource::collection($similar),
            ]);
        } catch (\Exception $e) {
            Log::error('[Discovery] Similar books failed', [
                'catalog_book_id' => $catalogBook->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'data' => [],
                'error' => 'Failed to load similar books',
            ], 500);
        }
    }

    /**
     * Search the catalog for books.
     *
     * Supports two modes:
     * - keyword (default): SQL ILIKE search on title/author
     * - semantic: Vector similarity search using embeddings
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => 'required|string|min:2|max:200',
            'limit' => 'integer|min:1|max:50',
            'mode' => 'string|in:keyword,semantic',
        ]);

        $query = $validated['q'];
        $limit = $validated['limit'] ?? 20;
        $mode = $validated['mode'] ?? 'keyword';

        Log::info('[Discovery] Search requested', [
            'query' => $query,
            'mode' => $mode,
            'limit' => $limit,
            'user_id' => $request->user()?->id,
        ]);

        if ($mode === 'semantic') {
            $books = $this->recommendationService->semanticSearch($query, $limit);
        } else {
            $books = CatalogBook::where('title', 'ILIKE', "%{$query}%")
                ->orWhere('author', 'ILIKE', "%{$query}%")
                ->orderByDesc('popularity_score')
                ->limit($limit)
                ->get();
        }

        Log::info('[Discovery] Search completed', [
            'query' => $query,
            'mode' => $mode,
            'result_count' => $books->count(),
        ]);

        return response()->json([
            'data' => CatalogBookResource::collection($books),
        ]);
    }

    /**
     * Get a single catalog book by ID.
     */
    public function show(CatalogBook $catalogBook): JsonResponse
    {
        Log::info('[Discovery] Book detail requested', [
            'catalog_book_id' => $catalogBook->id,
            'title' => $catalogBook->title,
        ]);

        return response()->json(
            new CatalogBookResource($catalogBook)
        );
    }

    /**
     * Refresh the user's recommendation profile.
     */
    public function refreshProfile(Request $request): JsonResponse
    {
        Log::info('[Discovery] Profile refresh requested', [
            'user_id' => $request->user()?->id,
        ]);

        $this->recommendationService->refreshUserEmbedding($request->user());

        Log::info('[Discovery] Profile refresh completed', [
            'user_id' => $request->user()?->id,
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Get recommendation metrics for analytics.
     *
     * Returns CTR, conversion rates, and top performing books.
     * Intended for admin/analytics use.
     */
    public function metrics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => 'integer|min:1|max:365',
        ]);

        $days = $validated['days'] ?? 30;

        Log::info('[Discovery] Metrics requested', [
            'days' => $days,
            'user_id' => $request->user()?->id,
        ]);

        $metrics = $this->signalService->getRecommendationMetrics($days);
        $topBooks = $this->signalService->getTopPerformingBooks($days, 10, 10);

        $topBooksWithDetails = collect($topBooks)->map(function ($item) {
            $book = CatalogBook::find($item['catalog_book_id']);
            return array_merge($item, [
                'title' => $book?->title,
                'author' => $book?->author,
                'cover_url' => $book?->cover_url,
            ]);
        });

        return response()->json([
            'metrics' => $metrics,
            'top_performing_books' => $topBooksWithDetails,
        ]);
    }
}
