<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\SearchSourceEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\ChangePasswordRequest;
use App\Http\Requests\User\DeleteAccountRequest;
use App\Http\Requests\User\UpdatePreferencesRequest;
use App\Http\Requests\User\UpdateProfileRequest;
use App\Http\Requests\User\UpdateThemeRequest;
use App\Http\Requests\User\UploadAvatarRequest;
use App\Http\Resources\UserResource;
use App\Services\BookSearch\BookSearchManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return response()->json(new UserResource($user));
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update([
            'password' => Hash::make($request->validated('password')),
        ]);

        return response()->json(['message' => __('Password changed successfully.')]);
    }

    public function updateTheme(UpdateThemeRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update(['theme' => $request->validated('theme')]);

        return response()->json(new UserResource($user));
    }

    public function uploadAvatar(UploadAvatarRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['avatar_path' => $path]);

        return response()->json([
            'avatar_url' => Storage::disk('public')->url($path),
        ]);
    }

    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update(['avatar_path' => null]);

        return response()->json(['message' => 'Avatar removed']);
    }

    public function updatePreferences(UpdatePreferencesRequest $request): JsonResponse
    {
        $user = $request->user();
        $currentPreferences = $user->preferences ?? [];
        $newPreferences = array_merge($currentPreferences, $request->validated());

        $user->update(['preferences' => $newPreferences]);

        return response()->json(new UserResource($user));
    }

    public function exportData(Request $request): JsonResponse
    {
        $user = $request->user();

        $userBooks = $user->userBooks()
            ->with(['book', 'readingSessions', 'tags'])
            ->get();

        $export = [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at->toIso8601String(),
            ],
            'library' => $userBooks->map(function ($userBook) {
                return [
                    'book' => [
                        'title' => $userBook->book->title,
                        'author' => $userBook->book->author,
                        'isbn' => $userBook->book->isbn,
                        'isbn13' => $userBook->book->isbn13,
                        'page_count' => $userBook->book->page_count,
                        'published_date' => $userBook->book->published_date,
                        'publisher' => $userBook->book->publisher,
                    ],
                    'status' => $userBook->status->value,
                    'rating' => $userBook->rating,
                    'current_page' => $userBook->current_page,
                    'is_dnf' => $userBook->is_dnf,
                    'dnf_reason' => $userBook->dnf_reason,
                    'started_at' => $userBook->started_at?->toIso8601String(),
                    'finished_at' => $userBook->finished_at?->toIso8601String(),
                    'tags' => $userBook->tags->pluck('name')->toArray(),
                    'sessions' => $userBook->readingSessions->map(fn ($s) => [
                        'started_at' => $s->started_at->toIso8601String(),
                        'ended_at' => $s->ended_at?->toIso8601String(),
                        'start_page' => $s->start_page,
                        'end_page' => $s->end_page,
                        'pages_read' => $s->pages_read,
                        'duration_minutes' => $s->duration_minutes,
                        'notes' => $s->notes,
                    ])->toArray(),
                ];
            })->toArray(),
            'exported_at' => now()->toIso8601String(),
        ];

        return response()->json($export);
    }

    public function destroy(DeleteAccountRequest $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user) {
            if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
                Storage::disk('public')->delete($user->avatar_path);
            }

            $user->tokens()->delete();
            $user->userBooks()->delete();
            $user->delete();
        });

        return response()->json(['message' => __('Account deleted successfully.')]);
    }

    /**
     * Get OPDS settings for the current user.
     */
    public function getOpdsSettings(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'opds_server_url' => $user->opds_server_url,
            'opds_username' => $user->opds_username,
            'has_password' => ! empty($user->opds_password),
            'preferred_search_source' => $user->preferred_search_source?->value ?? 'google',
            'is_configured' => $user->hasOpdsConfigured(),
        ]);
    }

    /**
     * Update OPDS settings for the current user.
     */
    public function updateOpdsSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'opds_server_url' => ['nullable', 'url', 'max:500'],
            'opds_username' => ['nullable', 'string', 'max:255'],
            'opds_password' => ['nullable', 'string', 'max:255'],
            'preferred_search_source' => ['nullable', Rule::enum(SearchSourceEnum::class)],
        ]);

        $user = $request->user();

        $updateData = [
            'opds_server_url' => $validated['opds_server_url'] ?? null,
            'opds_username' => $validated['opds_username'] ?? null,
        ];

        if (array_key_exists('opds_password', $validated)) {
            $updateData['opds_password'] = $validated['opds_password'];
        }

        if (isset($validated['preferred_search_source'])) {
            $updateData['preferred_search_source'] = $validated['preferred_search_source'];
        }

        $user->update($updateData);

        return response()->json([
            'message' => __('OPDS settings updated successfully.'),
            'opds_server_url' => $user->opds_server_url,
            'opds_username' => $user->opds_username,
            'has_password' => ! empty($user->opds_password),
            'preferred_search_source' => $user->preferred_search_source?->value ?? 'google',
            'is_configured' => $user->hasOpdsConfigured(),
        ]);
    }

    /**
     * Test OPDS connection for the current user.
     */
    public function testOpdsConnection(Request $request, BookSearchManager $searchManager): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasOpdsConfigured()) {
            return response()->json([
                'success' => false,
                'message' => __('OPDS server not configured.'),
            ]);
        }

        $result = $searchManager->testOpdsConnection($user);

        return response()->json($result);
    }

    /**
     * Clear OPDS settings for the current user.
     */
    public function clearOpdsSettings(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->update([
            'opds_server_url' => null,
            'opds_username' => null,
            'opds_password' => null,
            'preferred_search_source' => SearchSourceEnum::Google,
        ]);

        return response()->json([
            'message' => __('OPDS settings cleared successfully.'),
        ]);
    }
}
