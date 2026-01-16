<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\CatalogBook;
use App\Services\Discovery\CoverFetchService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;

/**
 * Job to fetch cover URLs for catalog books from Google Books API.
 *
 * Processes books in batches, prioritizing by popularity score.
 * Self-dispatches for the next batch until all books have covers.
 */
class FetchCatalogCoversJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 2;

    public int $backoff = 60;

    public function __construct(
        public int $batchSize = 50,
        public int $offset = 0,
        public ?int $maxBooks = null,
    ) {}

    /**
     * Get the middleware the job should pass through.
     *
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [new RateLimited('google-books-api')];
    }

    public function handle(CoverFetchService $coverService): void
    {
        $maxBooks = $this->maxBooks ?? config('discovery.catalog.initial_embed_count', 5000);

        $books = CatalogBook::whereNull('cover_url')
            ->orderByDesc('popularity_score')
            ->offset($this->offset)
            ->limit($this->batchSize)
            ->get();

        if ($books->isEmpty()) {
            Log::info('[FetchCatalogCoversJob] No more books need covers');

            return;
        }

        $successCount = 0;
        $failCount = 0;

        foreach ($books as $book) {
            try {
                $coverUrl = $coverService->fetchCoverUrl(
                    $book->isbn,
                    $book->title,
                    $book->author
                );

                if ($coverUrl) {
                    $book->update(['cover_url' => $coverUrl]);
                    $successCount++;
                } else {
                    $book->update(['cover_url' => '']);
                    $failCount++;
                }

                usleep(200000);
            } catch (\Exception $e) {
                Log::warning('[FetchCatalogCoversJob] Failed to fetch cover', [
                    'book_id' => $book->id,
                    'error' => $e->getMessage(),
                ]);
                $failCount++;
            }
        }

        Log::info('[FetchCatalogCoversJob] Batch complete', [
            'success' => $successCount,
            'failed' => $failCount,
            'offset' => $this->offset,
        ]);

        $nextOffset = $this->offset + $this->batchSize;

        if ($nextOffset < $maxBooks) {
            $remaining = CatalogBook::whereNull('cover_url')->count();

            if ($remaining > 0) {
                self::dispatch($this->batchSize, $nextOffset, $this->maxBooks)
                    ->delay(now()->addSeconds(10));

                Log::info('[FetchCatalogCoversJob] Dispatched next batch', [
                    'next_offset' => $nextOffset,
                    'remaining' => $remaining,
                ]);
            }
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[FetchCatalogCoversJob] Job failed', [
            'error' => $exception->getMessage(),
            'offset' => $this->offset,
        ]);
    }
}
