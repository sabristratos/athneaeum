<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Discovery\NYTBestsellerService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Job to sync weekly NYT bestsellers from the API.
 *
 * After sync completes, dispatches classification and embedding
 * jobs for newly imported books.
 */
class SyncNYTBestsellersJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 2;

    public function __construct() {}

    public function handle(NYTBestsellerService $service): void
    {
        if (! $service->isApiEnabled()) {
            Log::warning('[SyncNYTBestsellersJob] NYT API not configured, skipping sync');

            return;
        }

        Log::info('[SyncNYTBestsellersJob] Starting weekly bestseller sync');

        try {
            $results = $service->syncWeeklyBestsellers();

            Log::info('[SyncNYTBestsellersJob] Sync complete', $results);

            if ($results['imported'] > 0) {
                $delay = config('discovery.catalog.embedding_delay_seconds', 5);

                FetchCatalogCoversJob::dispatch()
                    ->delay(now()->addSeconds($delay));

                ClassifyCatalogBooksJob::dispatch()
                    ->delay(now()->addSeconds($delay + 5));

                GenerateCatalogEmbeddingsJob::dispatch()
                    ->delay(now()->addSeconds($delay + 10));

                Log::info('[SyncNYTBestsellersJob] Dispatched post-import jobs');
            }
        } catch (\Exception $e) {
            Log::error('[SyncNYTBestsellersJob] Sync failed', [
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[SyncNYTBestsellersJob] Job failed permanently', [
            'error' => $exception->getMessage(),
        ]);
    }
}
