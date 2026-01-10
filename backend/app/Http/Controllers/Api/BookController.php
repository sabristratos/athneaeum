<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\BookSearchServiceInterface;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookResource;
use App\Models\Book;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookController extends Controller
{
    public function __construct(
        private BookSearchServiceInterface $bookSearchService
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
            'lang' => ['nullable', 'string', 'size:2'],
            'genres' => ['nullable', 'string', 'max:500'],
            'min_rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'year_from' => ['nullable', 'integer', 'min:1800', 'max:'.date('Y')],
            'year_to' => ['nullable', 'integer', 'min:1800', 'max:'.date('Y')],
        ]);

        $genres = $request->input('genres')
            ? array_map('trim', explode(',', $request->input('genres')))
            : null;

        $results = $this->bookSearchService->search(
            $request->input('query'),
            (int) $request->input('limit', 20),
            (int) $request->input('start_index', 0),
            $request->input('lang'),
            $genres,
            $request->float('min_rating'),
            $request->integer('year_from') ?: null,
            $request->integer('year_to') ?: null
        );

        return response()->json([
            'data' => $results['items'],
            'meta' => [
                'total' => $results['totalItems'],
                'start_index' => $results['startIndex'],
                'has_more' => $results['hasMore'],
                'provider' => $this->bookSearchService->getProviderName(),
            ],
        ]);
    }

    /**
     * Get a specific book by ID.
     */
    public function show(Book $book): BookResource
    {
        return new BookResource($book);
    }
}
