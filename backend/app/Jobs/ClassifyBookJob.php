<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\MoodEnum;
use App\Models\Book;
use App\Models\User;
use App\Services\ExpoPushService;
use App\Services\Ingestion\LLM\LLMConsultant;
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

    public function handle(LLMConsultant $llmConsultant, ExpoPushService $pushService): void
    {
        $book = Book::find($this->bookId);

        if (! $book) {
            return;
        }

        if ($book->is_classified) {
            return;
        }

        if (empty($book->description)) {
            Log::debug('Skipping classification - no description', [
                'book_id' => $book->id,
                'title' => $book->title,
            ]);

            return;
        }

        if (! $llmConsultant->isEnabled()) {
            Log::debug('LLM classification disabled', ['book_id' => $book->id]);

            return;
        }

        try {
            $result = $llmConsultant->classifyBook(
                title: $book->title,
                description: $book->description,
                author: $book->author,
                genres: $book->genres ?? [],
                externalId: $book->external_id,
                externalProvider: $book->external_provider,
            );

            $contentClassification = $result['content'];

            $book->update([
                'audience' => $contentClassification->audience,
                'intensity' => $contentClassification->intensity,
                'moods' => array_map(fn (MoodEnum $m) => $m->value, $contentClassification->moods),
                'classification_confidence' => $contentClassification->confidence,
                'is_classified' => true,
            ]);

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
