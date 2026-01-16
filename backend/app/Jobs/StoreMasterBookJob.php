<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Contracts\Discovery\BookResolutionServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Job to store a search result in the master_books table.
 *
 * Runs on low priority queue to avoid blocking user searches.
 * Handles deduplication via the BookResolutionService.
 */
class StoreMasterBookJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 30;

    public int $tries = 2;

    public int $backoff = 10;

    /**
     * @param  array<string, mixed>  $bookData  Search result data to store
     */
    public function __construct(
        public array $bookData
    ) {}

    public function handle(BookResolutionServiceInterface $resolution): void
    {
        // Skip if no title
        if (empty($this->bookData['title'])) {
            Log::debug('[StoreMasterBook] Skipping book with no title');

            return;
        }

        // Double-check it doesn't exist (race condition protection)
        $existing = $resolution->findExisting(
            isbn13: $this->bookData['isbn13'] ?? $this->bookData['isbn'] ?? null,
            googleBooksId: $this->bookData['external_id'] ?? null,
            title: $this->bookData['title'],
            author: $this->bookData['author'] ?? null
        );

        if ($existing) {
            Log::debug('[StoreMasterBook] Book already exists', [
                'master_book_id' => $existing->id,
                'title' => $existing->title,
            ]);

            return;
        }

        // Create the master book (with queued enrichment)
        $book = $resolution->create($this->bookData, queueEnrichment: true);

        Log::info('[StoreMasterBook] Stored new master book', [
            'id' => $book->id,
            'title' => $book->title,
            'isbn13' => $book->isbn13,
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[StoreMasterBook] Job failed', [
            'title' => $this->bookData['title'] ?? 'unknown',
            'error' => $exception->getMessage(),
        ]);
    }
}
