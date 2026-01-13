<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\BookStatusEnum;
use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\ReadingGoal;
use App\Models\ReadingSession;
use App\Models\ReadThrough;
use App\Models\Series;
use App\Models\Tag;
use App\Models\UserBook;
use App\Models\UserPreference;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Handles synchronization between mobile app's local WatermelonDB and server.
 */
class SyncController extends Controller
{
    /**
     * Pull changes from server since the given timestamp.
     */
    public function pull(Request $request): JsonResponse
    {
        $lastPulledAt = $request->integer('last_pulled_at', 0);
        $timestamp = $lastPulledAt > 0
            ? Carbon::createFromTimestampMs($lastPulledAt)
            : null;

        $userId = $request->user()->id;

        $userBooks = UserBook::where('user_id', $userId)
            ->when($timestamp, fn ($q) => $q->where('updated_at', '>', $timestamp))
            ->with('book')
            ->get();

        $bookIds = $userBooks->pluck('book_id')->unique();
        $books = Book::whereIn('id', $bookIds)
            ->when($timestamp, fn ($q) => $q->where('updated_at', '>', $timestamp))
            ->get();

        $sessions = ReadingSession::whereHas('userBook', fn ($q) => $q->where('user_id', $userId))
            ->when($timestamp, fn ($q) => $q->where('updated_at', '>', $timestamp))
            ->get();

        $userBookIds = $userBooks->pluck('id');
        $readThroughs = ReadThrough::whereIn('user_book_id', $userBookIds)
            ->when($timestamp, fn ($q) => $q->where('updated_at', '>', $timestamp))
            ->get();

        $seriesIds = $books->pluck('series_id')->filter()->unique();
        $series = Series::whereIn('id', $seriesIds)
            ->when($timestamp, fn ($q) => $q->where('updated_at', '>', $timestamp))
            ->get();

        $tags = Tag::forUser($userId)
            ->when($timestamp, fn ($q) => $q->where('updated_at', '>', $timestamp))
            ->get();

        $preferences = UserPreference::where('user_id', $userId)
            ->when($timestamp, fn ($q) => $q->where('updated_at', '>', $timestamp))
            ->get();

        $goals = ReadingGoal::where('user_id', $userId)
            ->when($timestamp, fn ($q) => $q->where('updated_at', '>', $timestamp))
            ->get();

        return response()->json([
            'changes' => [
                'books' => [
                    'created' => $timestamp ? [] : $books->map(fn ($b) => $this->transformBook($b))->toArray(),
                    'updated' => $timestamp ? $books->map(fn ($b) => $this->transformBook($b))->toArray() : [],
                    'deleted' => [],
                ],
                'user_books' => [
                    'created' => $timestamp ? [] : $userBooks->map(fn ($ub) => $this->transformUserBook($ub))->toArray(),
                    'updated' => $timestamp ? $userBooks->map(fn ($ub) => $this->transformUserBook($ub))->toArray() : [],
                    'deleted' => [],
                ],
                'read_throughs' => [
                    'created' => $timestamp ? [] : $readThroughs->map(fn ($rt) => $this->transformReadThrough($rt))->toArray(),
                    'updated' => $timestamp ? $readThroughs->map(fn ($rt) => $this->transformReadThrough($rt))->toArray() : [],
                    'deleted' => [],
                ],
                'reading_sessions' => [
                    'created' => $timestamp ? [] : $sessions->map(fn ($s) => $this->transformSession($s))->toArray(),
                    'updated' => $timestamp ? $sessions->map(fn ($s) => $this->transformSession($s))->toArray() : [],
                    'deleted' => [],
                ],
                'series' => [
                    'created' => $timestamp ? [] : $series->map(fn ($s) => $this->transformSeries($s))->toArray(),
                    'updated' => $timestamp ? $series->map(fn ($s) => $this->transformSeries($s))->toArray() : [],
                    'deleted' => [],
                ],
                'tags' => [
                    'created' => $timestamp ? [] : $tags->map(fn ($t) => $this->transformTag($t))->toArray(),
                    'updated' => $timestamp ? $tags->map(fn ($t) => $this->transformTag($t))->toArray() : [],
                    'deleted' => [],
                ],
                'user_preferences' => [
                    'created' => $timestamp ? [] : $preferences->map(fn ($p) => $this->transformPreference($p))->toArray(),
                    'updated' => $timestamp ? $preferences->map(fn ($p) => $this->transformPreference($p))->toArray() : [],
                    'deleted' => [],
                ],
                'reading_goals' => [
                    'created' => $timestamp ? [] : $goals->map(fn ($g) => $this->transformGoal($g))->toArray(),
                    'updated' => $timestamp ? $goals->map(fn ($g) => $this->transformGoal($g))->toArray() : [],
                    'deleted' => [],
                ],
            ],
            'timestamp' => now()->getTimestampMs(),
        ]);
    }

    /**
     * Push local changes from mobile to server.
     */
    public function push(Request $request): JsonResponse
    {
        $idMappings = ['books' => [], 'user_books' => [], 'read_throughs' => [], 'reading_sessions' => [], 'tags' => [], 'user_preferences' => [], 'reading_goals' => []];
        $counts = ['books' => 0, 'user_books' => 0, 'read_throughs' => 0, 'reading_sessions' => 0, 'tags' => 0, 'user_preferences' => 0, 'reading_goals' => 0];
        $skipped = ['user_books' => [], 'read_throughs' => [], 'reading_sessions' => []];

        DB::transaction(function () use ($request, &$idMappings, &$counts, &$skipped) {
            $userId = $request->user()->id;
            $data = $request->all();

            // Process created books
            foreach ($data['books']['created'] ?? [] as $bookData) {
                $book = Book::updateOrCreate(
                    [
                        'external_id' => $bookData['external_id'],
                        'external_provider' => $bookData['external_provider'] ?? 'google_books',
                    ],
                    [
                        'title' => $bookData['title'],
                        'author' => $bookData['author'],
                        'cover_url' => $bookData['cover_url'] ?? null,
                        'page_count' => $bookData['page_count'] ?? null,
                        'height_cm' => $bookData['height_cm'] ?? null,
                        'width_cm' => $bookData['width_cm'] ?? null,
                        'thickness_cm' => $bookData['thickness_cm'] ?? null,
                        'isbn' => $bookData['isbn'] ?? null,
                        'description' => $bookData['description'] ?? null,
                        'genres' => $bookData['genres'] ?? [],
                        'published_date' => $bookData['published_date'] ?? null,
                    ]
                );
                $idMappings['books'][] = [
                    'local_id' => $bookData['local_id'],
                    'server_id' => $book->id,
                ];
                $counts['books']++;
            }

            // Process updated books
            foreach ($data['books']['updated'] ?? [] as $bookData) {
                if (! isset($bookData['server_id'])) {
                    continue;
                }
                $book = Book::find($bookData['server_id']);
                if ($book) {
                    $book->update([
                        'title' => $bookData['title'] ?? $book->title,
                        'author' => $bookData['author'] ?? $book->author,
                        'cover_url' => $bookData['cover_url'] ?? $book->cover_url,
                    ]);
                }
            }

            // Process created user_books
            foreach ($data['user_books']['created'] ?? [] as $ubData) {
                $bookId = $this->resolveBookId($ubData, $idMappings);
                if (! $bookId) {
                    $skipped['user_books'][] = [
                        'local_id' => $ubData['local_id'] ?? null,
                        'reason' => 'book_not_found',
                    ];

                    continue;
                }

                $userBook = UserBook::updateOrCreate(
                    [
                        'user_id' => $userId,
                        'book_id' => $bookId,
                    ],
                    [
                        'status' => $ubData['status'],
                        'rating' => $ubData['rating'] ?? null,
                        'current_page' => $ubData['current_page'] ?? 0,
                        'format' => $ubData['format'] ?? null,
                        'price' => $ubData['price'] ?? null,
                        'is_pinned' => $ubData['is_pinned'] ?? false,
                        'queue_position' => $ubData['queue_position'] ?? null,
                        'review' => $ubData['review'] ?? null,
                        'is_dnf' => $ubData['is_dnf'] ?? false,
                        'dnf_reason' => $ubData['dnf_reason'] ?? null,
                        'started_at' => $ubData['started_at'] ?? null,
                        'finished_at' => $ubData['finished_at'] ?? null,
                        'custom_cover_url' => $ubData['custom_cover_url'] ?? null,
                    ]
                );
                $idMappings['user_books'][] = [
                    'local_id' => $ubData['local_id'],
                    'server_id' => $userBook->id,
                    'server_book_id' => $bookId,
                ];
                $counts['user_books']++;
            }

            // Process updated user_books
            foreach ($data['user_books']['updated'] ?? [] as $ubData) {
                if (! isset($ubData['server_id'])) {
                    continue;
                }
                $userBook = UserBook::where('id', $ubData['server_id'])
                    ->where('user_id', $userId)
                    ->first();

                if ($userBook) {
                    $updateData = [];
                    if (isset($ubData['status'])) {
                        $updateData['status'] = $ubData['status'];
                    }
                    if (array_key_exists('rating', $ubData)) {
                        $updateData['rating'] = $ubData['rating'];
                    }
                    if (isset($ubData['current_page'])) {
                        $updateData['current_page'] = max($ubData['current_page'], $userBook->current_page);
                    }
                    if (array_key_exists('format', $ubData)) {
                        $updateData['format'] = $ubData['format'];
                    }
                    if (array_key_exists('price', $ubData)) {
                        $updateData['price'] = $ubData['price'];
                    }
                    if (isset($ubData['is_pinned'])) {
                        $updateData['is_pinned'] = $ubData['is_pinned'];
                    }
                    if (array_key_exists('queue_position', $ubData)) {
                        $updateData['queue_position'] = $ubData['queue_position'];
                    }
                    if (array_key_exists('review', $ubData)) {
                        $updateData['review'] = $ubData['review'];
                    }
                    if (isset($ubData['is_dnf'])) {
                        $updateData['is_dnf'] = $ubData['is_dnf'];
                    }
                    if (array_key_exists('dnf_reason', $ubData)) {
                        $updateData['dnf_reason'] = $ubData['dnf_reason'];
                    }
                    if (array_key_exists('started_at', $ubData)) {
                        $updateData['started_at'] = $ubData['started_at'];
                    }
                    if (array_key_exists('finished_at', $ubData)) {
                        $updateData['finished_at'] = $ubData['finished_at'];
                    }
                    if (array_key_exists('custom_cover_url', $ubData)) {
                        $updateData['custom_cover_url'] = $ubData['custom_cover_url'];
                    }

                    $userBook->update($updateData);
                }
            }

            // Process deleted user_books
            foreach ($data['user_books']['deleted'] ?? [] as $serverId) {
                UserBook::where('id', $serverId)
                    ->where('user_id', $userId)
                    ->delete();
            }

            // Process created read_throughs
            foreach ($data['read_throughs']['created'] ?? [] as $rtData) {
                $userBookId = $this->resolveUserBookId($rtData, $idMappings, $userId);
                if (! $userBookId) {
                    $skipped['read_throughs'][] = [
                        'local_id' => $rtData['local_id'] ?? null,
                        'reason' => 'user_book_not_found',
                    ];

                    continue;
                }

                $readThrough = ReadThrough::updateOrCreate(
                    [
                        'user_book_id' => $userBookId,
                        'read_number' => $rtData['read_number'] ?? 1,
                    ],
                    [
                        'status' => $rtData['status'] ?? 'reading',
                        'rating' => $rtData['rating'] ?? null,
                        'review' => $rtData['review'] ?? null,
                        'is_dnf' => $rtData['is_dnf'] ?? false,
                        'dnf_reason' => $rtData['dnf_reason'] ?? null,
                        'started_at' => $rtData['started_at'] ?? null,
                        'finished_at' => $rtData['finished_at'] ?? null,
                    ]
                );
                $idMappings['read_throughs'][] = [
                    'local_id' => $rtData['local_id'],
                    'server_id' => $readThrough->id,
                    'server_user_book_id' => $userBookId,
                ];
                $counts['read_throughs']++;
            }

            // Process updated read_throughs
            foreach ($data['read_throughs']['updated'] ?? [] as $rtData) {
                if (! isset($rtData['server_id'])) {
                    continue;
                }
                $readThrough = ReadThrough::whereHas('userBook', fn ($q) => $q->where('user_id', $userId))
                    ->where('id', $rtData['server_id'])
                    ->first();

                if ($readThrough) {
                    $updateData = [];
                    if (isset($rtData['status'])) {
                        $updateData['status'] = $rtData['status'];
                    }
                    if (array_key_exists('rating', $rtData)) {
                        $updateData['rating'] = $rtData['rating'];
                    }
                    if (array_key_exists('review', $rtData)) {
                        $updateData['review'] = $rtData['review'];
                    }
                    if (isset($rtData['is_dnf'])) {
                        $updateData['is_dnf'] = $rtData['is_dnf'];
                    }
                    if (array_key_exists('dnf_reason', $rtData)) {
                        $updateData['dnf_reason'] = $rtData['dnf_reason'];
                    }
                    if (array_key_exists('started_at', $rtData)) {
                        $updateData['started_at'] = $rtData['started_at'];
                    }
                    if (array_key_exists('finished_at', $rtData)) {
                        $updateData['finished_at'] = $rtData['finished_at'];
                    }

                    $readThrough->update($updateData);
                }
            }

            // Process deleted read_throughs
            foreach ($data['read_throughs']['deleted'] ?? [] as $serverId) {
                ReadThrough::whereHas('userBook', fn ($q) => $q->where('user_id', $userId))
                    ->where('id', $serverId)
                    ->delete();
            }

            // Process created reading_sessions
            foreach ($data['reading_sessions']['created'] ?? [] as $sessionData) {
                $userBookId = $this->resolveUserBookId($sessionData, $idMappings, $userId);
                if (! $userBookId) {
                    $skipped['reading_sessions'][] = [
                        'local_id' => $sessionData['local_id'] ?? null,
                        'reason' => 'user_book_not_found',
                    ];

                    continue;
                }

                $readThroughId = $this->resolveReadThroughId($sessionData, $idMappings, $userId);

                $session = ReadingSession::create([
                    'user_book_id' => $userBookId,
                    'read_through_id' => $readThroughId,
                    'date' => $sessionData['date'],
                    'pages_read' => $sessionData['pages_read'],
                    'start_page' => $sessionData['start_page'],
                    'end_page' => $sessionData['end_page'],
                    'duration_seconds' => $sessionData['duration_seconds'] ?? null,
                    'notes' => $sessionData['notes'] ?? null,
                ]);

                $userBook = UserBook::find($userBookId);
                if ($userBook && $userBook->status === BookStatusEnum::WantToRead) {
                    $userBook->update([
                        'status' => BookStatusEnum::Reading,
                        'started_at' => $userBook->started_at ?? now(),
                    ]);
                }

                $idMappings['reading_sessions'][] = [
                    'local_id' => $sessionData['local_id'],
                    'server_id' => $session->id,
                    'server_user_book_id' => $userBookId,
                ];
                $counts['reading_sessions']++;
            }

            // Process deleted reading_sessions
            foreach ($data['reading_sessions']['deleted'] ?? [] as $serverId) {
                ReadingSession::whereHas('userBook', fn ($q) => $q->where('user_id', $userId))
                    ->where('id', $serverId)
                    ->delete();
            }

            // Process created tags (only user-created, not system)
            foreach ($data['tags']['created'] ?? [] as $tagData) {
                $tag = Tag::create([
                    'user_id' => $userId,
                    'name' => $tagData['name'],
                    'slug' => $tagData['slug'],
                    'color' => $tagData['color'],
                    'is_system' => false,
                    'sort_order' => $tagData['sort_order'] ?? 0,
                ]);
                $idMappings['tags'][] = [
                    'local_id' => $tagData['local_id'],
                    'server_id' => $tag->id,
                ];
                $counts['tags']++;
            }

            // Process updated tags
            foreach ($data['tags']['updated'] ?? [] as $tagData) {
                if (! isset($tagData['server_id'])) {
                    continue;
                }
                $tag = Tag::where('id', $tagData['server_id'])
                    ->where('user_id', $userId)
                    ->where('is_system', false)
                    ->first();

                if ($tag) {
                    $tag->update([
                        'name' => $tagData['name'] ?? $tag->name,
                        'color' => $tagData['color'] ?? $tag->color,
                        'sort_order' => $tagData['sort_order'] ?? $tag->sort_order,
                    ]);
                }
            }

            // Process deleted tags
            foreach ($data['tags']['deleted'] ?? [] as $serverId) {
                Tag::where('id', $serverId)
                    ->where('user_id', $userId)
                    ->where('is_system', false)
                    ->delete();
            }

            // Process created user_preferences
            foreach ($data['user_preferences']['created'] ?? [] as $prefData) {
                $preference = UserPreference::firstOrCreate(
                    [
                        'user_id' => $userId,
                        'category' => $prefData['category'],
                        'type' => $prefData['type'],
                        'normalized' => $prefData['normalized'],
                    ],
                    [
                        'value' => $prefData['value'],
                    ]
                );
                $idMappings['user_preferences'][] = [
                    'local_id' => $prefData['local_id'],
                    'server_id' => $preference->id,
                ];
                $counts['user_preferences']++;
            }

            // Process deleted user_preferences
            foreach ($data['user_preferences']['deleted'] ?? [] as $serverId) {
                UserPreference::where('id', $serverId)
                    ->where('user_id', $userId)
                    ->delete();
            }

            // Process created reading_goals
            foreach ($data['reading_goals']['created'] ?? [] as $goalData) {
                $goal = ReadingGoal::updateOrCreate(
                    [
                        'user_id' => $userId,
                        'type' => $goalData['type'],
                        'period' => $goalData['period'],
                        'year' => $goalData['year'],
                        'month' => $goalData['month'] ?? null,
                        'week' => $goalData['week'] ?? null,
                    ],
                    [
                        'target' => $goalData['target'],
                        'is_active' => $goalData['is_active'] ?? true,
                        'completed_at' => isset($goalData['completed_at']) ? Carbon::parse($goalData['completed_at']) : null,
                    ]
                );
                $idMappings['reading_goals'][] = [
                    'local_id' => $goalData['local_id'],
                    'server_id' => $goal->id,
                ];
                $counts['reading_goals']++;
            }

            // Process updated reading_goals
            foreach ($data['reading_goals']['updated'] ?? [] as $goalData) {
                if (! isset($goalData['server_id'])) {
                    continue;
                }
                $goal = ReadingGoal::where('id', $goalData['server_id'])
                    ->where('user_id', $userId)
                    ->first();

                if ($goal) {
                    $updateData = [];
                    if (isset($goalData['target'])) {
                        $updateData['target'] = $goalData['target'];
                    }
                    if (isset($goalData['is_active'])) {
                        $updateData['is_active'] = $goalData['is_active'];
                    }
                    if (array_key_exists('completed_at', $goalData)) {
                        $updateData['completed_at'] = $goalData['completed_at'] ? Carbon::parse($goalData['completed_at']) : null;
                    }

                    $goal->update($updateData);
                }
            }

            // Process deleted reading_goals
            foreach ($data['reading_goals']['deleted'] ?? [] as $serverId) {
                ReadingGoal::where('id', $serverId)
                    ->where('user_id', $userId)
                    ->delete();
            }
        });

        return response()->json([
            'status' => 'success',
            'id_mappings' => $idMappings,
            'counts' => $counts,
            'skipped' => $skipped,
            'timestamp' => now()->getTimestampMs(),
        ]);
    }

    /**
     * Upload a custom cover image for a book.
     */
    public function uploadCover(Request $request): JsonResponse
    {
        $request->validate([
            'cover' => 'required|image|max:5120',
            'user_book_id' => 'required|integer',
        ]);

        $userBook = UserBook::find($request->user_book_id);

        if (! $userBook || $userBook->user_id !== $request->user()->id) {
            abort(403, 'You do not have permission to upload covers for this book.');
        }

        $path = $request->file('cover')->store('covers', 'public');
        $url = Storage::disk('public')->url($path);

        $userBook->update(['custom_cover_url' => $url]);

        return response()->json([
            'cover_url' => $url,
            'user_book_id' => $userBook->id,
        ]);
    }

    /**
     * Resolve book ID from local ID using mappings.
     */
    private function resolveBookId(array $data, array $idMappings): ?int
    {
        // Check if server_book_id is provided
        if (isset($data['server_book_id'])) {
            return (int) $data['server_book_id'];
        }

        // Check if local book_id maps to a server ID
        if (isset($data['book_local_id'])) {
            foreach ($idMappings['books'] as $mapping) {
                if ($mapping['local_id'] === $data['book_local_id']) {
                    return $mapping['server_id'];
                }
            }
        }

        // Try to find by external_id if provided
        if (isset($data['external_id'])) {
            $book = Book::where('external_id', $data['external_id'])->first();
            if ($book) {
                return $book->id;
            }
        }

        return null;
    }

    /**
     * Resolve user_book ID from local ID using mappings.
     */
    private function resolveUserBookId(array $data, array $idMappings, int $userId): ?int
    {
        // Check if server_user_book_id is provided
        if (isset($data['server_user_book_id'])) {
            return (int) $data['server_user_book_id'];
        }

        // Check if local user_book_id maps to a server ID
        if (isset($data['user_book_local_id'])) {
            foreach ($idMappings['user_books'] as $mapping) {
                if ($mapping['local_id'] === $data['user_book_local_id']) {
                    return $mapping['server_id'];
                }
            }
        }

        return null;
    }

    /**
     * Resolve read_through ID from local ID using mappings.
     */
    private function resolveReadThroughId(array $data, array $idMappings, int $userId): ?int
    {
        // Check if server_read_through_id is provided
        if (isset($data['server_read_through_id'])) {
            return (int) $data['server_read_through_id'];
        }

        // Check if local read_through_id maps to a server ID
        if (isset($data['read_through_local_id'])) {
            foreach ($idMappings['read_throughs'] as $mapping) {
                if ($mapping['local_id'] === $data['read_through_local_id']) {
                    return $mapping['server_id'];
                }
            }
        }

        return null;
    }

    /**
     * Transform book model for API response.
     */
    private function transformBook(Book $book): array
    {
        return [
            'id' => $book->id,
            'external_id' => $book->external_id,
            'external_provider' => $book->external_provider,
            'title' => $book->title,
            'author' => $book->author,
            'cover_url' => $book->cover_url,
            'page_count' => $book->page_count,
            'height_cm' => $book->height_cm !== null ? (float) $book->height_cm : null,
            'width_cm' => $book->width_cm !== null ? (float) $book->width_cm : null,
            'thickness_cm' => $book->thickness_cm !== null ? (float) $book->thickness_cm : null,
            'isbn' => $book->isbn,
            'description' => $book->description,
            'genres' => $book->genres,
            'published_date' => $book->published_date?->toDateString(),
            'series_id' => $book->series_id,
            'volume_number' => $book->volume_number,
            'volume_title' => $book->volume_title,
            'audience' => $book->audience?->value,
            'intensity' => $book->intensity?->value,
            'moods' => $book->moods,
            'is_classified' => $book->is_classified ?? false,
            'classification_confidence' => $book->classification_confidence,
            'created_at' => $book->created_at->toIso8601String(),
            'updated_at' => $book->updated_at->toIso8601String(),
        ];
    }

    /**
     * Transform user_book model for API response.
     */
    private function transformUserBook(UserBook $userBook): array
    {
        return [
            'id' => $userBook->id,
            'book_id' => $userBook->book_id,
            'status' => $userBook->status->value,
            'rating' => $userBook->rating,
            'current_page' => $userBook->current_page,
            'format' => $userBook->format?->value,
            'price' => $userBook->price !== null ? (float) $userBook->price : null,
            'is_pinned' => $userBook->is_pinned,
            'queue_position' => $userBook->queue_position,
            'review' => $userBook->review,
            'is_dnf' => $userBook->is_dnf,
            'dnf_reason' => $userBook->dnf_reason,
            'started_at' => $userBook->started_at?->toDateString(),
            'finished_at' => $userBook->finished_at?->toDateString(),
            'custom_cover_url' => $userBook->custom_cover_url,
            'created_at' => $userBook->created_at->toIso8601String(),
            'updated_at' => $userBook->updated_at->toIso8601String(),
        ];
    }

    /**
     * Transform read_through model for API response.
     */
    private function transformReadThrough(ReadThrough $readThrough): array
    {
        return [
            'id' => $readThrough->id,
            'user_book_id' => $readThrough->user_book_id,
            'read_number' => $readThrough->read_number,
            'status' => $readThrough->status->value,
            'rating' => $readThrough->rating,
            'review' => $readThrough->review,
            'is_dnf' => $readThrough->is_dnf,
            'dnf_reason' => $readThrough->dnf_reason,
            'started_at' => $readThrough->started_at?->toDateString(),
            'finished_at' => $readThrough->finished_at?->toDateString(),
            'created_at' => $readThrough->created_at->toIso8601String(),
            'updated_at' => $readThrough->updated_at->toIso8601String(),
        ];
    }

    /**
     * Transform reading session model for API response.
     */
    private function transformSession(ReadingSession $session): array
    {
        return [
            'id' => $session->id,
            'user_book_id' => $session->user_book_id,
            'read_through_id' => $session->read_through_id,
            'date' => $session->date->format('Y-m-d'),
            'pages_read' => $session->pages_read,
            'start_page' => $session->start_page,
            'end_page' => $session->end_page,
            'duration_seconds' => $session->duration_seconds,
            'formatted_duration' => $session->formatted_duration,
            'notes' => $session->notes,
            'created_at' => $session->created_at->toIso8601String(),
            'updated_at' => $session->updated_at->toIso8601String(),
        ];
    }

    /**
     * Transform series model for API response.
     */
    private function transformSeries(Series $series): array
    {
        return [
            'id' => $series->id,
            'title' => $series->title,
            'author' => $series->author,
            'external_id' => $series->external_id,
            'external_provider' => $series->external_provider,
            'total_volumes' => $series->total_volumes,
            'is_complete' => $series->is_complete,
            'description' => $series->description,
            'created_at' => $series->created_at->toIso8601String(),
            'updated_at' => $series->updated_at->toIso8601String(),
        ];
    }

    /**
     * Transform tag model for API response.
     */
    private function transformTag(Tag $tag): array
    {
        return [
            'id' => $tag->id,
            'name' => $tag->name,
            'slug' => $tag->slug,
            'color' => $tag->color->value,
            'is_system' => $tag->is_system,
            'sort_order' => $tag->sort_order,
            'created_at' => $tag->created_at->toIso8601String(),
            'updated_at' => $tag->updated_at->toIso8601String(),
        ];
    }

    /**
     * Transform user preference model for API response.
     */
    private function transformPreference(UserPreference $preference): array
    {
        return [
            'id' => $preference->id,
            'category' => $preference->category->value,
            'type' => $preference->type->value,
            'value' => $preference->value,
            'normalized' => $preference->normalized,
            'created_at' => $preference->created_at->toIso8601String(),
            'updated_at' => $preference->updated_at->toIso8601String(),
        ];
    }

    /**
     * Transform reading goal model for API response.
     */
    private function transformGoal(ReadingGoal $goal): array
    {
        return [
            'id' => $goal->id,
            'type' => $goal->type->value,
            'period' => $goal->period->value,
            'target' => $goal->target,
            'year' => $goal->year,
            'month' => $goal->month,
            'week' => $goal->week,
            'is_active' => $goal->is_active,
            'completed_at' => $goal->completed_at?->toIso8601String(),
            'created_at' => $goal->created_at->toIso8601String(),
            'updated_at' => $goal->updated_at->toIso8601String(),
        ];
    }
}
