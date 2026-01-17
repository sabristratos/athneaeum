<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Contracts\Discovery\EmbeddingServiceInterface;
use App\Models\CatalogBook;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;

/**
 * Job to generate embeddings for catalog books.
 *
 * Processes books in batches, prioritizing by review count.
 * Self-dispatches for the next batch until all books are embedded.
 */
class GenerateCatalogEmbeddingsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 2;

    public int $backoff = 60;

    public function __construct(
        public int $batchSize = 100,
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
        return [new RateLimited('embedding-generation')];
    }

    public function handle(EmbeddingServiceInterface $embeddingService): void
    {
        if (! $embeddingService->isEnabled()) {
            Log::info('[GenerateCatalogEmbeddingsJob] Embedding service disabled, skipping');

            return;
        }

        $maxBooks = $this->maxBooks ?? config('discovery.catalog.initial_embed_count', 5000);

        $books = CatalogBook::where('is_embedded', false)
            ->orderByDesc('review_count')
            ->offset($this->offset)
            ->limit($this->batchSize)
            ->get();

        if ($books->isEmpty()) {
            Log::info('[GenerateCatalogEmbeddingsJob] No more books to embed');

            return;
        }

        $successCount = 0;
        $failCount = 0;

        foreach ($books as $book) {
            try {
                $text = $embeddingService->buildEmbeddingText($book);

                if (strlen($text) < 10) {
                    Log::debug('[GenerateCatalogEmbeddingsJob] Skipping book with insufficient text', [
                        'book_id' => $book->id,
                    ]);
                    $failCount++;

                    continue;
                }

                $embedding = $embeddingService->generateEmbedding($text);

                if (! empty($embedding)) {
                    $this->saveEmbedding($book, $embedding);
                    $successCount++;
                } else {
                    $failCount++;
                }

                usleep(100000);
            } catch (\Exception $e) {
                Log::warning('[GenerateCatalogEmbeddingsJob] Failed to embed book', [
                    'book_id' => $book->id,
                    'error' => $e->getMessage(),
                ]);
                $failCount++;
            }
        }

        Log::info('[GenerateCatalogEmbeddingsJob] Batch complete', [
            'success' => $successCount,
            'failed' => $failCount,
            'offset' => $this->offset,
        ]);

        $nextOffset = $this->offset + $this->batchSize;
        $totalProcessed = $nextOffset;

        if ($totalProcessed < $maxBooks) {
            $remaining = CatalogBook::where('is_embedded', false)->count();

            if ($remaining > 0) {
                $delay = config('discovery.catalog.embedding_delay_seconds', 5);

                self::dispatch($this->batchSize, $nextOffset, $this->maxBooks)
                    ->delay(now()->addSeconds($delay));

                Log::info('[GenerateCatalogEmbeddingsJob] Dispatched next batch', [
                    'next_offset' => $nextOffset,
                    'remaining' => $remaining,
                ]);
            }
        }
    }

    /**
     * Save the embedding to the database using raw SQL for pgvector.
     */
    private function saveEmbedding(CatalogBook $book, array $embedding): void
    {
        if (config('database.default') === 'pgsql') {
            $vectorString = '['.implode(',', $embedding).']';

            \Illuminate\Support\Facades\DB::statement(
                'UPDATE catalog_books SET embedding = ?, is_embedded = true, updated_at = ? WHERE id = ?',
                [$vectorString, now(), $book->id]
            );
        } else {
            $book->update([
                'embedding' => $embedding,
                'is_embedded' => true,
            ]);
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[GenerateCatalogEmbeddingsJob] Job failed', [
            'error' => $exception->getMessage(),
            'offset' => $this->offset,
        ]);
    }
}
