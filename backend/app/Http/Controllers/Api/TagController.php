<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\TagColorEnum;
use App\Http\Controllers\Controller;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rules\Enum;

class TagController extends Controller
{
    /**
     * Get all tags available to the authenticated user.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $tags = Tag::forUser($request->user()->id)
            ->withCount('userBooks')
            ->orderBy('is_system', 'desc')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return TagResource::collection($tags);
    }

    /**
     * Create a new user tag.
     */
    public function store(Request $request): TagResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', new Enum(TagColorEnum::class)],
            'emoji' => ['nullable', 'string', 'max:10'],
        ]);

        $tag = Tag::create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'color' => $validated['color'],
            'emoji' => $validated['emoji'] ?? null,
            'is_system' => false,
        ]);

        return new TagResource($tag);
    }

    /**
     * Update a user tag.
     */
    public function update(Request $request, Tag $tag): TagResource
    {
        if ($tag->is_system || $tag->user_id !== $request->user()->id) {
            abort(403, __('Cannot modify this tag'));
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:50'],
            'color' => ['sometimes', 'string', new Enum(TagColorEnum::class)],
            'emoji' => ['nullable', 'string', 'max:10'],
        ]);

        $tag->update($validated);

        return new TagResource($tag);
    }

    /**
     * Delete a user tag.
     */
    public function destroy(Request $request, Tag $tag): JsonResponse
    {
        if ($tag->is_system || $tag->user_id !== $request->user()->id) {
            abort(403, __('Cannot delete this tag'));
        }

        $tag->delete();

        return response()->json([
            'message' => __('Tag deleted'),
        ]);
    }

    /**
     * Get available tag colors.
     */
    public function colors(): JsonResponse
    {
        return response()->json([
            'data' => TagColorEnum::options(),
        ]);
    }
}
