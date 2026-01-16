<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Book;
use App\Models\User;
use App\Services\BookClassificationService;
use App\Services\ExpoPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;

class ClassifyBookJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $backoff = 120;

    public function __construct(
        public int $bookId,
        public ?int $userId = null
    ) {}

    public function middleware(): array
    {
        return [new RateLimited('llm-classification')];
    }

    public function handle(BookClassificationService $classificationService, ExpoPushService $pushService): void
    {
        $book = Book::find($this->bookId);

        if (! $book) {
            return;
        }

        if (! $classificationService->canClassify($book)) {
            Log::debug('Skipping classification', [
                'book_id' => $book->id,
                'title' => $book->title,
                'reason' => $book->is_classified ? 'already classified' : 'no description',
            ]);

            return;
        }

        if (! $classificationService->isEnabled()) {
            Log::debug('LLM classification disabled', ['book_id' => $book->id]);

            return;
        }

        try {
            $contentClassification = $classificationService->classify($book);

            Log::info('Book classified successfully', [
                'book_id' => $book->id,
                'title' => $book->title,
                'audience' => $contentClassification->audience?->value,
                'intensity' => $contentClassification->intensity?->value,
                'moods_count' => count($contentClassification->moods),
            ]);

            $this->notifyUser($pushService, $book->id);
        } catch (\Exception $e) {
            Log::error('Book classification failed', [
                'book_id' => $book->id,
                'title' => $book->title,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function notifyUser(ExpoPushService $pushService, int $bookId): void
    {
        if (! $this->userId) {
            return;
        }

        $user = User::find($this->userId);
        if (! $user || empty($user->expo_push_token)) {
            return;
        }

        $pushService->sendClassificationComplete($user->expo_push_token, $bookId);
    }
}
