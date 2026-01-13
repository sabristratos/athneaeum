<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SeriesResource;
use App\Models\Series;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SeriesController extends Controller
{
    /**
     * List all series.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Series::query()->withCount('books');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('author', 'like', "%{$search}%");
            });
        }

        $series = $query->orderBy('title')->get();

        return SeriesResource::collection($series);
    }

    /**
     * Get a single series with its books.
     */
    public function show(Series $series): SeriesResource
    {
        return new SeriesResource($series->load('books.userBooks'));
    }

    /**
     * Create a new series.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'author' => ['required', 'string', 'max:255'],
            'total_volumes' => ['nullable', 'integer', 'min:1'],
            'is_complete' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:10000'],
        ]);

        $series = Series::create($validated);

        return response()->json(new SeriesResource($series), 201);
    }

    /**
     * Update a series.
     */
    public function update(Request $request, Series $series): SeriesResource
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'author' => ['sometimes', 'string', 'max:255'],
            'total_volumes' => ['nullable', 'integer', 'min:1'],
            'is_complete' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:10000'],
        ]);

        $series->update($validated);

        return new SeriesResource($series);
    }

    /**
     * Delete a series.
     * Books in the series will have their series_id set to null.
     */
    public function destroy(Series $series): JsonResponse
    {
        $series->delete();

        return response()->json(['message' => __('Series deleted')]);
    }

    /**
     * Assign a book to a series.
     */
    public function assignBook(Request $request, Series $series): JsonResponse
    {
        $validated = $request->validate([
            'book_id' => ['required', 'exists:books,id'],
            'volume_number' => ['required', 'integer', 'min:1'],
            'volume_title' => ['nullable', 'string', 'max:255'],
        ]);

        \App\Models\Book::where('id', $validated['book_id'])->update([
            'series_id' => $series->id,
            'volume_number' => $validated['volume_number'],
            'volume_title' => $validated['volume_title'] ?? null,
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Remove a book from a series.
     */
    public function removeBook(Request $request, Series $series): JsonResponse
    {
        $validated = $request->validate([
            'book_id' => ['required', 'exists:books,id'],
        ]);

        \App\Models\Book::where('id', $validated['book_id'])
            ->where('series_id', $series->id)
            ->update([
                'series_id' => null,
                'volume_number' => null,
                'volume_title' => null,
            ]);

        return response()->json(['success' => true]);
    }
}
