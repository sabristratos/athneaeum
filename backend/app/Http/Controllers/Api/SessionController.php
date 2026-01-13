<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReadingSessionResource;
use App\Models\ReadingSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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
}
