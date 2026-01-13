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
     * Get available tag colors.
     */
    public function colors(): JsonResponse
    {
        return response()->json([
            'data' => TagColorEnum::options(),
        ]);
    }
}
