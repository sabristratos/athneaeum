<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\BookSearchServiceInterface;
use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use App\Enums\MoodEnum;
use App\Exceptions\BookSearchException;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookResource;
use App\Models\Book;
use App\Services\BookClassificationService;
use App\Services\BookSearch\BookSearchManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookController extends Controller
{
    public function __construct(
        private BookSearchServiceInterface $bookSearchService,
        private BookSearchManager $searchManager,
        private BookClassificationService $classificationService
    ) {}

    /**
     * Search books via the configured book search provider.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'query' => ['required', 'string', 'min:2', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
            'start_index' => ['nullable', 'integer', 'min:0'],
            'lang' => ['nullable', 'string', 'max:3'],
            'genres' => ['nullable', 'string', 'max:500'],
            'min_rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'year_from' => ['nullable', 'integer', 'min:1800', 'max:'.date('Y')],
            'year_to' => ['nullable', 'integer', 'min:1800', 'max:'.date('Y')],
            'source' => ['nullable', 'string', 'in:google,opds,both'],
        ]);

        $genres = $request->input('genres')
            ? array_map('trim', explode(',', $request->input('genres')))
            : null;

        $lang = $request->input('lang', 'all');
        $langRestrict = $lang === 'all' ? null : $lang;

        try {
            $results = $this->searchManager->search(
                $request->user(),
                $request->input('query'),
                (int) $request->input('limit', 20),
                (int) $request->input('start_index', 0),
                $langRestrict,
                $genres,
                $request->float('min_rating'),
                $request->integer('year_from') ?: null,
                $request->integer('year_to') ?: null,
                $request->input('source')
            );

            return response()->json([
                'items' => $results['items'],
                'total' => $results['totalItems'],
                'start_index' => $results['startIndex'],
                'has_more' => $results['hasMore'],
                'provider' => $results['provider'],
            ]);
        } catch (BookSearchException $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'code' => $e->getErrorCode(),
            ], $e->getHttpStatus());
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 503);
        }
    }

    /**
     * Get a specific book by ID.
     */
    public function show(Book $book): BookResource
    {
        return new BookResource($book);
    }

    /**
     * Get all editions of a book by title and author.
     */
    public function editions(Request $request): JsonResponse
    {
        $request->validate([
            'title' => ['required', 'string', 'min:1', 'max:255'],
            'author' => ['required', 'string', 'min:1', 'max:255'],
        ]);

        try {
            $editions = $this->bookSearchService->searchEditions(
                $request->input('title'),
                $request->input('author')
            );

            return response()->json([
                'items' => $editions,
                'total' => count($editions),
            ]);
        } catch (BookSearchException $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'code' => $e->getErrorCode(),
            ], $e->getHttpStatus());
        }
    }

    /**
     * Classify a book's content using LLM.
     */
    public function classify(Book $book): JsonResponse
    {
        if (! $this->classificationService->isEnabled()) {
            return response()->json([
                'error' => __('Classification service is not available'),
            ], 503);
        }

        if (empty($book->description)) {
            return response()->json([
                'error' => __('Book has no description to classify'),
            ], 422);
        }

        try {
            $this->classificationService->classify($book);

            return response()->json(new BookResource($book->fresh()));
        } catch (\Exception $e) {
            return response()->json([
                'error' => __('Classification failed: :message', ['message' => $e->getMessage()]),
            ], 500);
        }
    }

    /**
     * Get available classification options.
     */
    public function classificationOptions(): JsonResponse
    {
        return response()->json([
            'audiences' => AudienceEnum::options(),
            'intensities' => ContentIntensityEnum::options(),
            'moods' => MoodEnum::options(),
        ]);
    }
}
