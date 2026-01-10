<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\BookSearchServiceInterface;
use App\Enums\BookStatusEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\Library\StoreLibraryBookRequest;
use App\Http\Requests\Library\UpdateUserBookRequest;
use App\Http\Resources\UserBookResource;
use App\Models\Book;
use App\Models\UserBook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class LibraryController extends Controller
{
    public function __construct(
        private BookSearchServiceInterface $bookSearchService
    ) {}

    /**
     * Get the authenticated user's library.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['nullable', 'string'],
        ]);

        $query = $request->user()
            ->userBooks()
            ->with('book');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $userBooks = $query->latest()->get();

        return UserBookResource::collection($userBooks);
    }

    /**
     * Add a book to the user's library.
     */
    public function store(StoreLibraryBookRequest $request): JsonResponse
    {
        $userBook = DB::transaction(function () use ($request) {
            $bookData = $request->safe()->only([
                'title',
                'author',
                'cover_url',
                'page_count',
                'isbn',
                'description',
                'genres',
                'published_date',
            ]);

            $externalId = $request->validated('external_id');
            $externalProvider = $request->validated('external_provider') ?? $this->bookSearchService->getProviderName();

            if ($externalId) {
                $book = Book::where('external_id', $externalId)
                    ->where('external_provider', $externalProvider)
                    ->first();

                if (! $book) {
                    $book = Book::create([
                        'external_id' => $externalId,
                        'external_provider' => $externalProvider,
                        ...$bookData,
                    ]);
                }
            } else {
                $book = Book::create($bookData);
            }

            $status = BookStatusEnum::from($request->validated('status'));

            $userBook = UserBook::firstOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'book_id' => $book->id,
                ],
                [
                    'status' => $status,
                    'started_at' => $status === BookStatusEnum::Reading ? now() : null,
                ]
            );

            return $userBook->load('book');
        });

        return response()->json(new UserBookResource($userBook), 201);
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

        return new UserBookResource($userBook->load('book'));
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

        return response()->json([
            'message' => __('Book removed from library'),
        ]);
    }
}
