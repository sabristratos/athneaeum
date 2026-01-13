<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\GenreEnum;
use App\Enums\PreferenceCategoryEnum;
use App\Enums\PreferenceTypeEnum;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserPreferenceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manages user preferences for favorites and excludes.
 */
class UserPreferenceController extends Controller
{
    /**
     * Get all preferences grouped by type and category.
     */
    public function index(Request $request): JsonResponse
    {
        $grouped = $request->user()->getGroupedPreferences();

        return response()->json($grouped);
    }

    /**
     * Get all preferences as a flat list with full details.
     */
    public function list(Request $request): JsonResponse
    {
        $preferences = $request->user()
            ->userPreferences()
            ->orderBy('category')
            ->orderBy('type')
            ->orderBy('value')
            ->get();

        return response()->json(UserPreferenceResource::collection($preferences));
    }

    /**
     * Get available categories and types.
     */
    public function options(): JsonResponse
    {
        return response()->json([
            'categories' => PreferenceCategoryEnum::options(),
            'types' => PreferenceTypeEnum::options(),
        ]);
    }

    /**
     * Get predefined genres for preference selection.
     */
    public function genres(Request $request): JsonResponse
    {
        $user = $request->user();

        $favoriteGenres = $user->favoriteGenres()->pluck('normalized')->toArray();
        $excludedGenres = $user->excludedGenres()->pluck('normalized')->toArray();

        $grouped = GenreEnum::groupedOptions();

        foreach ($grouped as &$category) {
            foreach ($category['genres'] as &$genre) {
                $normalized = strtolower($genre['value']);
                $genre['is_favorite'] = in_array($normalized, $favoriteGenres, true);
                $genre['is_excluded'] = in_array($normalized, $excludedGenres, true);
            }
        }

        return response()->json($grouped);
    }
}
