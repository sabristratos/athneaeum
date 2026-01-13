<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserBookResource;
use App\Models\Tag;
use App\Models\UserBook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserBookTagController extends Controller
{
    /**
     * Sync tags for a user book (replace all tags).
     */
    public function sync(Request $request, UserBook $userBook): UserBookResource
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'tag_ids' => ['required', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
        ]);

        $validTagIds = Tag::forUser($request->user()->id)
            ->whereIn('id', $validated['tag_ids'])
            ->pluck('id');

        $userBook->tags()->sync($validTagIds);

        return new UserBookResource($userBook->load(['book', 'tags']));
    }

    /**
     * Add a single tag to a user book.
     */
    public function attach(Request $request, UserBook $userBook, Tag $tag): JsonResponse
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        if (! $tag->is_system && $tag->user_id !== $request->user()->id) {
            abort(403);
        }

        $userBook->tags()->syncWithoutDetaching([$tag->id]);

        return response()->json([
            'message' => __('Tag added'),
        ]);
    }

    /**
     * Remove a tag from a user book.
     */
    public function detach(Request $request, UserBook $userBook, Tag $tag): JsonResponse
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        $userBook->tags()->detach($tag->id);

        return response()->json([
            'message' => __('Tag removed'),
        ]);
    }
}
