<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReadThroughResource;
use App\Http\Resources\UserBookResource;
use App\Models\UserBook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LibraryController extends Controller
{
    /**
     * Get the authenticated user's library.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['nullable', 'string'],
            'tags' => ['nullable', 'string'],
            'tag_mode' => ['nullable', 'string', 'in:any,all'],
            'audience' => ['nullable', 'string'],
            'intensity' => ['nullable', 'string'],
            'mood' => ['nullable', 'string'],
        ]);

        $query = $request->user()
            ->userBooks()
            ->with(['book.series', 'book.genreRelations', 'tags']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('tags')) {
            $tagSlugs = explode(',', $request->input('tags'));
            $tagMode = $request->input('tag_mode', 'any');

            if ($tagMode === 'all') {
                foreach ($tagSlugs as $slug) {
                    $query->whereHas('tags', fn ($q) => $q->where('slug', $slug));
                }
            } else {
                $query->whereHas('tags', fn ($q) => $q->whereIn('slug', $tagSlugs));
            }
        }

        if ($request->filled('audience')) {
            $query->whereHas('book', fn ($q) => $q->where('audience', $request->input('audience')));
        }

        if ($request->filled('intensity')) {
            $query->whereHas('book', fn ($q) => $q->where('intensity', $request->input('intensity')));
        }

        if ($request->filled('mood')) {
            $mood = $request->input('mood');
            $query->whereHas('book', fn ($q) => $q->whereJsonContains('moods', $mood));
        }

        $userBooks = $query->latest()->get();

        return UserBookResource::collection($userBooks);
    }

    /**
     * Get a single user book entry.
     */
    public function show(Request $request, UserBook $userBook): UserBookResource
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        return new UserBookResource($userBook->load(['book.series', 'book.genreRelations', 'tags', 'readThroughs']));
    }

    /**
     * Get external IDs of all books in the user's library with their status.
     *
     * Returns a lightweight map for quickly checking if a book is already
     * in the user's library during search.
     */
    public function externalIds(Request $request): JsonResponse
    {
        $libraryMap = $request->user()
            ->userBooks()
            ->with('book:id,external_id')
            ->get()
            ->filter(fn (UserBook $ub) => $ub->book->external_id !== null)
            ->mapWithKeys(fn (UserBook $ub) => [
                $ub->book->external_id => [
                    'status' => $ub->status->value,
                    'user_book_id' => $ub->id,
                ],
            ]);

        return response()->json($libraryMap);
    }

    /**
     * Get reading history (all read-throughs) for a book.
     */
    public function readingHistory(Request $request, UserBook $userBook): JsonResponse
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        $readThroughs = $userBook->readThroughs()
            ->with('readingSessions')
            ->get();

        return response()->json([
            'read_count' => $userBook->read_count,
            'read_throughs' => ReadThroughResource::collection($readThroughs),
        ]);
    }
}
