<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\GenreEnum;
use App\Enums\PreferenceCategoryEnum;
use App\Enums\PreferenceTypeEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\Preference\BatchPreferenceRequest;
use App\Http\Requests\Preference\StorePreferenceRequest;
use App\Http\Resources\UserPreferenceResource;
use App\Models\UserPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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
     * Store a new preference.
     */
    public function store(StorePreferenceRequest $request): JsonResponse
    {
        $user = $request->user();
        $normalized = strtolower(trim($request->input('value')));

        $existing = $user->userPreferences()
            ->where('category', $request->input('category'))
            ->where('type', $request->input('type'))
            ->where('normalized', $normalized)
            ->first();

        if ($existing) {
            return response()->json(new UserPreferenceResource($existing), 200);
        }

        $preference = $user->userPreferences()->create([
            'category' => $request->input('category'),
            'type' => $request->input('type'),
            'value' => trim($request->input('value')),
        ]);

        if ($request->input('category') === PreferenceCategoryEnum::Author->value) {
            Cache::forget("user.{$user->id}.library_authors");
        }

        return response()->json(new UserPreferenceResource($preference), 201);
    }

    /**
     * Delete a preference.
     */
    public function destroy(Request $request, UserPreference $preference): JsonResponse
    {
        if ($preference->user_id !== $request->user()->id) {
            abort(403);
        }

        $isAuthorPreference = $preference->category === PreferenceCategoryEnum::Author;

        $preference->delete();

        if ($isAuthorPreference) {
            Cache::forget("user.{$request->user()->id}.library_authors");
        }

        return response()->json(['message' => __('Preference deleted.')]);
    }

    /**
     * Batch create preferences.
     */
    public function batchStore(BatchPreferenceRequest $request): JsonResponse
    {
        $user = $request->user();
        $created = [];
        $skipped = 0;
        $hasAuthorPreference = false;

        DB::transaction(function () use ($user, $request, &$created, &$skipped, &$hasAuthorPreference) {
            foreach ($request->input('preferences') as $pref) {
                $normalized = strtolower(trim($pref['value']));

                if ($pref['category'] === PreferenceCategoryEnum::Author->value) {
                    $hasAuthorPreference = true;
                }

                $existing = $user->userPreferences()
                    ->where('category', $pref['category'])
                    ->where('type', $pref['type'])
                    ->where('normalized', $normalized)
                    ->exists();

                if ($existing) {
                    $skipped++;

                    continue;
                }

                $created[] = $user->userPreferences()->create([
                    'category' => $pref['category'],
                    'type' => $pref['type'],
                    'value' => trim($pref['value']),
                ]);
            }
        });

        if ($hasAuthorPreference) {
            Cache::forget("user.{$user->id}.library_authors");
        }

        return response()->json([
            'created' => UserPreferenceResource::collection($created),
            'created_count' => count($created),
            'skipped_count' => $skipped,
        ], 201);
    }

    /**
     * Batch delete preferences.
     */
    public function batchDestroy(BatchPreferenceRequest $request): JsonResponse
    {
        $user = $request->user();
        $deleted = 0;
        $hasAuthorPreference = false;

        DB::transaction(function () use ($user, $request, &$deleted, &$hasAuthorPreference) {
            foreach ($request->input('preferences') as $pref) {
                $normalized = strtolower(trim($pref['value']));

                if ($pref['category'] === PreferenceCategoryEnum::Author->value) {
                    $hasAuthorPreference = true;
                }

                $deleted += $user->userPreferences()
                    ->where('category', $pref['category'])
                    ->where('type', $pref['type'])
                    ->where('normalized', $normalized)
                    ->delete();
            }
        });

        if ($hasAuthorPreference) {
            Cache::forget("user.{$user->id}.library_authors");
        }

        return response()->json([
            'deleted_count' => $deleted,
        ]);
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
