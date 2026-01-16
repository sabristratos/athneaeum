<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Contracts\Discovery\CatalogIngestionServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Job to ingest a Kaggle books dataset CSV into the catalog.
 *
 * After ingestion completes, dispatches embedding generation
 * for the top books by review count.
 */
class IngestKaggleCatalogJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(
        public string $filePath,
        public int $chunkSize = 500,
    ) {}

    public function handle(CatalogIngestionServiceInterface $ingestionService): void
    {
        Log::info('[IngestKaggleCatalogJob] Starting catalog ingestion', [
            'file' => $this->filePath,
            'chunk_size' => $this->chunkSize,
        ]);

        try {
            $results = $ingestionService->ingestFromCsv($this->filePath, $this->chunkSize);

            Log::info('[IngestKaggleCatalogJob] Ingestion complete', $results);

            if ($results['processed'] > 0) {
                $delay = config('discovery.catalog.embedding_delay_seconds', 5);

                FetchCatalogCoversJob::dispatch()
                    ->delay(now()->addSeconds($delay));

                GenerateCatalogEmbeddingsJob::dispatch()
                    ->delay(now()->addSeconds($delay + 5));

                Log::info('[IngestKaggleCatalogJob] Dispatched cover fetch and embedding generation jobs');
            }
        } catch (\Exception $e) {
            Log::error('[IngestKaggleCatalogJob] Failed', [
                'error' => $e->getMessage(),
                'file' => $this->filePath,
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[IngestKaggleCatalogJob] Job failed permanently', [
            'error' => $exception->getMessage(),
            'file' => $this->filePath,
        ]);
    }
}
