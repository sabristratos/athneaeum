<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\DTOs\Ingestion\VibeClassificationDTO;
use App\Models\CatalogBook;
use App\Services\Ingestion\LLM\LLMConsultant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Backfill vibe classifications for catalog books.
 */
class ClassifyCatalogVibesCommand extends Command
{
    protected $signature = 'catalog:classify-vibes
                            {--batch-size=50 : Number of books to process per batch}
                            {--max-books=1000 : Maximum books to classify (0 = unlimited)}
                            {--prioritize-popular : Process popular books first}
                            {--regenerate-embeddings : Regenerate embeddings after vibe classification}
                            {--stats : Show vibe classification statistics only}';

    protected $description = 'Classify catalog books for reading experience vibes (pacing, mood, complexity, etc.)';

    private const RATE_LIMITER_KEY = 'catalog-vibe-classification';

    public function __construct(
        protected LLMConsultant $llmConsultant
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        if (! $this->llmConsultant->isEnabled()) {
            $this->error('LLM classification is not enabled. Set INGESTION_LLM_ENABLED=true and INGESTION_LLM_API_KEY in .env');

            return Command::FAILURE;
        }

        if ($this->option('stats')) {
            return $this->showStats();
        }

        $batchSize = (int) $this->option('batch-size');
        $maxBooks = (int) $this->option('max-books');
        $prioritizePopular = $this->option('prioritize-popular');
        $regenerateEmbeddings = $this->option('regenerate-embeddings');

        $this->info('Starting catalog vibe classification...');
        $this->newLine();

        $stats = $this->getStats();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Books', $stats['total']],
                ['Already Vibe Classified', $stats['classified']],
                ['Pending Vibe Classification', $stats['pending']],
                ['Coverage', $stats['percentage'].'%'],
            ]
        );

        if ($stats['pending'] === 0) {
            $this->info('All books are already vibe-classified.');

            return Command::SUCCESS;
        }

        $this->newLine();
        $this->info('Processing up to '.($maxBooks > 0 ? $maxBooks : 'all').' books...');
        $this->newLine();

        $result = $this->batchClassify($batchSize, $maxBooks, $prioritizePopular, $regenerateEmbeddings);

        $this->newLine();
        $this->info('Vibe classification complete:');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Books Classified', $result['classified']],
                ['Books Skipped', $result['skipped']],
                ['Errors', $result['errors']],
                ['Embeddings Regenerated', $result['embeddings_regenerated']],
            ]
        );

        $newStats = $this->getStats();
        $this->newLine();
        $this->info("New coverage: {$newStats['percentage']}%");

        return Command::SUCCESS;
    }

    /**
     * Classify a single catalog book's vibes.
     */
    private function classifyBook(CatalogBook $book): ?VibeClassificationDTO
    {
        if (empty($book->description)) {
            Log::debug('[VibeClassification] Skipping book without description', [
                'id' => $book->id,
                'title' => $book->title,
            ]);

            return null;
        }

        if ($book->is_vibe_classified) {
            Log::debug('[VibeClassification] Book already vibe-classified', [
                'id' => $book->id,
                'title' => $book->title,
            ]);

            return null;
        }

        $result = $this->llmConsultant->classifyVibesOnly(
            title: $book->title,
            description: $book->description,
            author: $book->author,
            genres: $book->genres ?? [],
            externalId: $book->external_id,
            externalProvider: $book->external_provider,
        );

        if (! $result->hasData()) {
            Log::warning('[VibeClassification] Empty vibe classification result', [
                'id' => $book->id,
                'title' => $book->title,
            ]);

            return null;
        }

        $book->applyVibeClassification($result);
        $book->save();

        Log::info('[VibeClassification] Book vibe-classified', [
            'id' => $book->id,
            'title' => $book->title,
            'mood_darkness' => $result->moodDarkness,
            'pacing_speed' => $result->pacingSpeed,
            'plot_archetype' => $result->plotArchetype?->value,
        ]);

        return $result;
    }

    /**
     * Batch classify catalog books' vibes.
     *
     * @return array{classified: int, skipped: int, errors: int, embeddings_regenerated: int}
     */
    private function batchClassify(
        int $batchSize,
        int $maxBooks,
        bool $prioritizePopular,
        bool $regenerateEmbeddings
    ): array {
        $stats = ['classified' => 0, 'skipped' => 0, 'errors' => 0, 'embeddings_regenerated' => 0];

        $query = CatalogBook::pendingVibeClassification();

        if ($prioritizePopular) {
            $query->orderByDesc('popularity_score');
        }

        if ($maxBooks > 0) {
            $query->limit($maxBooks);
        }

        $books = $query->get();
        $total = $books->count();

        Log::info('[VibeClassification] Starting batch vibe classification', [
            'total' => $total,
            'batchSize' => $batchSize,
            'prioritizePopular' => $prioritizePopular,
        ]);

        $progressBar = $this->output->createProgressBar($total);
        $progressBar->start();

        foreach ($books as $book) {
            if (! $this->checkRateLimit()) {
                Log::warning('[VibeClassification] Rate limit reached, stopping batch');
                break;
            }

            try {
                $result = $this->classifyBook($book);

                if ($result !== null) {
                    $stats['classified']++;

                    if ($regenerateEmbeddings) {
                        $book->update(['is_embedded' => false]);
                        $stats['embeddings_regenerated']++;
                    }
                } else {
                    $stats['skipped']++;
                }
            } catch (\Exception $e) {
                $stats['errors']++;
                Log::error('[VibeClassification] Vibe classification failed', [
                    'id' => $book->id,
                    'title' => $book->title,
                    'error' => $e->getMessage(),
                ]);
            }

            $progressBar->advance();

            if ($stats['classified'] > 0 && $stats['classified'] % $batchSize === 0) {
                Log::info('[VibeClassification] Batch progress', [
                    'classified' => $stats['classified'],
                    'skipped' => $stats['skipped'],
                    'errors' => $stats['errors'],
                ]);
            }
        }

        $progressBar->finish();

        Log::info('[VibeClassification] Batch vibe classification complete', $stats);

        return $stats;
    }

    /**
     * Get vibe classification statistics for the catalog.
     *
     * @return array{total: int, classified: int, pending: int, percentage: float}
     */
    private function getStats(): array
    {
        $total = CatalogBook::whereNotNull('description')
            ->where('description', '!=', '')
            ->count();
        $classified = CatalogBook::where('is_vibe_classified', true)->count();
        $pending = CatalogBook::pendingVibeClassification()->count();

        return [
            'total' => $total,
            'classified' => $classified,
            'pending' => $pending,
            'percentage' => $total > 0 ? round(($classified / $total) * 100, 1) : 0,
        ];
    }

    private function showStats(): int
    {
        $stats = $this->getStats();

        $this->info('Catalog Vibe Classification Statistics');
        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Books (with description)', $stats['total']],
                ['Vibe Classified', $stats['classified']],
                ['Pending', $stats['pending']],
                ['Coverage', $stats['percentage'].'%'],
            ]
        );

        return Command::SUCCESS;
    }

    /**
     * Check rate limit before making LLM call.
     */
    private function checkRateLimit(): bool
    {
        $maxAttempts = config('discovery.classification.rate_limit_per_minute', 30);

        if (RateLimiter::tooManyAttempts(self::RATE_LIMITER_KEY, $maxAttempts)) {
            $seconds = RateLimiter::availableIn(self::RATE_LIMITER_KEY);
            Log::debug('[VibeClassification] Rate limited, waiting', ['seconds' => $seconds]);
            sleep(min($seconds, 60));
        }

        RateLimiter::hit(self::RATE_LIMITER_KEY, 60);

        return true;
    }
}
