<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Discovery\CatalogClassificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;

/**
 * Job to classify catalog books using LLM.
 *
 * Processes books in batches, prioritizing by popularity.
 * Self-dispatches for the next batch until all books are classified.
 */
class ClassifyCatalogBooksJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 2;

    public int $backoff = 120;

    public function __construct(
        public int $batchSize = 50,
        public int $maxBooks = 0,
        public bool $prioritizePopular = true,
    ) {}

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [new RateLimited('llm-classification')];
    }

    public function handle(CatalogClassificationService $service): void
    {
        if (! $service->isEnabled()) {
            Log::info('[ClassifyCatalogBooksJob] Classification service disabled, skipping');

            return;
        }

        $stats = $service->getStats();

        if ($stats['pending'] === 0) {
            Log::info('[ClassifyCatalogBooksJob] No books pending classification');

            return;
        }

        Log::info('[ClassifyCatalogBooksJob] Starting batch classification', [
            'pending' => $stats['pending'],
            'batch_size' => $this->batchSize,
        ]);

        $result = $service->batchClassify(
            batchSize: $this->batchSize,
            maxBooks: $this->batchSize,
            prioritizePopular: $this->prioritizePopular
        );

        Log::info('[ClassifyCatalogBooksJob] Batch complete', $result);

        $newStats = $service->getStats();
        $shouldContinue = $newStats['pending'] > 0
            && ($this->maxBooks === 0 || $result['classified'] < $this->maxBooks);

        if ($shouldContinue) {
            $delay = config('discovery.catalog.embedding_delay_seconds', 5);

            self::dispatch($this->batchSize, $this->maxBooks, $this->prioritizePopular)
                ->delay(now()->addSeconds($delay));

            Log::info('[ClassifyCatalogBooksJob] Dispatched next batch', [
                'remaining' => $newStats['pending'],
            ]);
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[ClassifyCatalogBooksJob] Job failed', [
            'error' => $exception->getMessage(),
        ]);
    }
}
