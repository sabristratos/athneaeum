<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\BookStatusEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\Session\StoreReadingSessionRequest;
use App\Http\Resources\ReadingSessionResource;
use App\Models\ReadingSession;
use App\Models\UserBook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class SessionController extends Controller
{
    /**
     * Get reading sessions for the authenticated user.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'user_book_id' => ['nullable', 'exists:user_books,id'],
        ]);

        $query = ReadingSession::whereHas('userBook', function ($query) use ($request) {
            $query->where('user_id', $request->user()->id);
        });

        if ($request->filled('user_book_id')) {
            $query->where('user_book_id', $request->input('user_book_id'));
        }

        $sessions = $query->latest('date')->get();

        return ReadingSessionResource::collection($sessions);
    }

    /**
     * Log a new reading session.
     */
    public function store(StoreReadingSessionRequest $request): JsonResponse
    {
        $userBook = UserBook::findOrFail($request->validated('user_book_id'));

        if ($userBook->user_id !== $request->user()->id) {
            abort(403, 'You do not have permission to log sessions for this book.');
        }

        $session = DB::transaction(function () use ($request, $userBook) {
            $startPage = $request->validated('start_page');
            $endPage = $request->validated('end_page');

            $session = ReadingSession::create([
                'user_book_id' => $userBook->id,
                'date' => $request->validated('date'),
                'pages_read' => $endPage - $startPage,
                'start_page' => $startPage,
                'end_page' => $endPage,
                'duration_seconds' => $request->validated('duration_seconds'),
                'notes' => $request->validated('notes'),
            ]);

            $updateData = ['current_page' => $endPage];

            if ($userBook->status === BookStatusEnum::WantToRead) {
                $updateData['status'] = BookStatusEnum::Reading;
                $updateData['started_at'] = $userBook->started_at ?? now();
            }

            $userBook->update($updateData);

            return $session;
        });

        return response()->json(new ReadingSessionResource($session), 201);
    }
}
