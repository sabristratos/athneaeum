<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\BookIngestionServiceInterface;
use App\Contracts\BookSearchServiceInterface;
use App\DTOs\Ingestion\RawBookDTO;
use App\Enums\BookStatusEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\Library\StoreLibraryBookRequest;
use App\Http\Requests\Library\UpdateUserBookRequest;
use App\Http\Resources\ReadThroughResource;
use App\Http\Resources\UserBookResource;
use App\Models\Book;
use App\Models\UserBook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LibraryController extends Controller
{
    public function __construct(
        private BookSearchServiceInterface $bookSearchService,
        private BookIngestionServiceInterface $ingestionService
    ) {}

    /**
     * Get the authenticated user's library.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['nullable', 'string'],
            'tags' => ['nullable', 'string'],
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
            $query->whereHas('tags', function ($q) use ($tagSlugs) {
                $q->whereIn('slug', $tagSlugs);
            });
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
     * Add a book to the user's library.
     */
    public function store(StoreLibraryBookRequest $request): JsonResponse
    {
        Log::info('[LibraryController] Adding book to library', [
            'title' => $request->validated('title'),
            'genres' => $request->validated('genres'),
            'external_id' => $request->validated('external_id'),
        ]);

        $userBook = DB::transaction(function () use ($request) {
            $rawBookDTO = RawBookDTO::fromRequest([
                'title' => $request->validated('title'),
                'author' => $request->validated('author'),
                'cover_url' => $request->validated('cover_url'),
                'page_count' => $request->validated('page_count'),
                'height_cm' => $request->validated('height_cm'),
                'width_cm' => $request->validated('width_cm'),
                'thickness_cm' => $request->validated('thickness_cm'),
                'isbn' => $request->validated('isbn'),
                'description' => $request->validated('description'),
                'genres' => $request->validated('genres'),
                'published_date' => $request->validated('published_date'),
                'external_id' => $request->validated('external_id'),
                'external_provider' => $request->validated('external_provider')
                    ?? $this->bookSearchService->getProviderName(),
            ]);

            $book = $this->ingestionService->ingest($rawBookDTO);

            $status = BookStatusEnum::from($request->validated('status'));

            $userBook = UserBook::firstOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'book_id' => $book->id,
                ],
                [
                    'status' => $status,
                    'started_at' => $status === BookStatusEnum::Reading ? now() : null,
                    'finished_at' => $status === BookStatusEnum::Read ? now() : null,
                ]
            );

            return $userBook->load(['book.series', 'book.authors', 'book.genreRelations', 'tags']);
        });

        Cache::forget("user.{$request->user()->id}.library_authors");

        return response()->json(new UserBookResource($userBook), 201);
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
     * Update a user book entry.
     */
    public function update(UpdateUserBookRequest $request, UserBook $userBook): UserBookResource
    {
        $data = $request->validated();

        if (isset($data['status'])) {
            $status = BookStatusEnum::from($data['status']);

            if ($status === BookStatusEnum::Reading && ! $userBook->started_at) {
                $data['started_at'] = now();
            }

            if ($status === BookStatusEnum::Read && ! $userBook->finished_at) {
                $data['finished_at'] = now();
                $data['current_page'] = $userBook->book->page_count ?? $userBook->current_page;
            }

            if ($status === BookStatusEnum::Dnf) {
                $data['is_dnf'] = true;
            }
        }

        $userBook->update($data);

        return new UserBookResource($userBook->load(['book.series', 'book.genreRelations', 'tags']));
    }

    /**
     * Remove a book from the user's library.
     */
    public function destroy(Request $request, UserBook $userBook): JsonResponse
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        $userBook->delete();

        Cache::forget("user.{$request->user()->id}.library_authors");

        return response()->json([
            'message' => __('Book removed from library'),
        ]);
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
     * Pin a book as featured on the home screen.
     * Only one book can be pinned at a time.
     */
    public function pin(Request $request, UserBook $userBook): JsonResponse
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        DB::transaction(function () use ($request, $userBook) {
            $request->user()
                ->userBooks()
                ->where('id', '!=', $userBook->id)
                ->update(['is_pinned' => false]);

            $userBook->update(['is_pinned' => true]);
        });

        return response()->json(['success' => true]);
    }

    /**
     * Unpin a book from the home screen.
     */
    public function unpin(Request $request, UserBook $userBook): JsonResponse
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        $userBook->update(['is_pinned' => false]);

        return response()->json(['success' => true]);
    }

    /**
     * Reorder books in the queue (for TBR list).
     */
    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'book_ids' => ['required', 'array'],
            'book_ids.*' => ['integer', 'exists:user_books,id'],
        ]);

        $bookIds = $request->input('book_ids');
        $userId = $request->user()->id;

        DB::transaction(function () use ($bookIds, $userId) {
            foreach ($bookIds as $position => $bookId) {
                UserBook::where('id', $bookId)
                    ->where('user_id', $userId)
                    ->update(['queue_position' => $position]);
            }
        });

        return response()->json(['success' => true]);
    }

    /**
     * Start a re-read of a book.
     * Creates a new read-through and resets the user book to reading status.
     */
    public function startReread(Request $request, UserBook $userBook): JsonResponse
    {
        if ($userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        $readThrough = $userBook->startReread();

        return response()->json([
            'read_through' => new ReadThroughResource($readThrough),
            'user_book' => new UserBookResource($userBook->fresh()->load(['book.series', 'book.genreRelations', 'tags', 'readThroughs'])),
        ], 201);
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

    /**
     * Update a read-through (e.g., rating, review).
     */
    public function updateReadThrough(Request $request, \App\Models\ReadThrough $readThrough): ReadThroughResource
    {
        if ($readThrough->userBook->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'review' => ['nullable', 'string', 'max:10000'],
        ]);

        $readThrough->update($validated);

        return new ReadThroughResource($readThrough);
    }
}
