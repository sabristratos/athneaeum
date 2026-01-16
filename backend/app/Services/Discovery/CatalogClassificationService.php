<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use App\DTOs\Ingestion\ContentClassificationDTO;
use App\Enums\MoodEnum;
use App\Models\CatalogBook;
use App\Services\Ingestion\LLM\LLMConsultant;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

/**
 * Service for classifying catalog books using LLM.
 *
 * Classifies CatalogBook records with audience, intensity, and mood
 * to enable smarter discovery recommendations.
 */
class CatalogClassificationService
{
    private const RATE_LIMITER_KEY = 'catalog-classification';

    public function __construct(
        private LLMConsultant $llmConsultant
    ) {}

    /**
     * Check if classification service is available.
     */
    public function isEnabled(): bool
    {
        return $this->llmConsultant->isEnabled();
    }

    /**
     * Classify a single catalog book.
     *
     * @throws RuntimeException If classification fails
     */
    public function classify(CatalogBook $book): ?ContentClassificationDTO
    {
        if (empty($book->description)) {
            Log::debug('[CatalogClassification] Skipping book without description', [
                'id' => $book->id,
                'title' => $book->title,
            ]);

            return null;
        }

        if ($book->is_classified) {
            Log::debug('[CatalogClassification] Book already classified', [
                'id' => $book->id,
                'title' => $book->title,
            ]);

            return null;
        }

        $result = $this->llmConsultant->classifyContent(
            title: $book->title,
            description: $book->description,
            author: $book->author,
            genres: $book->genres ?? [],
            externalId: $book->external_id,
            externalProvider: $book->external_provider,
        );

        if (! $result->hasData()) {
            Log::warning('[CatalogClassification] Empty classification result', [
                'id' => $book->id,
                'title' => $book->title,
            ]);

            return null;
        }

        $book->update([
            'audience' => $result->audience?->value,
            'intensity' => $result->intensity?->value,
            'moods' => array_map(fn (MoodEnum $m) => $m->value, $result->moods),
            'classification_confidence' => $result->confidence,
            'is_classified' => true,
            'classified_at' => now(),
        ]);

        Log::info('[CatalogClassification] Book classified', [
            'id' => $book->id,
            'title' => $book->title,
            'audience' => $result->audience?->value,
            'intensity' => $result->intensity?->value,
            'moods' => array_map(fn (MoodEnum $m) => $m->value, $result->moods),
        ]);

        return $result;
    }

    /**
     * Batch classify catalog books.
     *
     * @param  int  $batchSize  Number of books to classify per batch
     * @param  int  $maxBooks  Maximum total books to classify (0 = unlimited)
     * @param  bool  $prioritizePopular  Sort by popularity score first
     * @return array{classified: int, skipped: int, errors: int}
     */
    public function batchClassify(
        int $batchSize = 50,
        int $maxBooks = 0,
        bool $prioritizePopular = true
    ): array {
        $stats = ['classified' => 0, 'skipped' => 0, 'errors' => 0];

        $query = CatalogBook::pendingClassification();

        if ($prioritizePopular) {
            $query->orderByDesc('popularity_score');
        }

        if ($maxBooks > 0) {
            $query->limit($maxBooks);
        }

        $books = $query->get();

        Log::info('[CatalogClassification] Starting batch classification', [
            'total' => $books->count(),
            'batchSize' => $batchSize,
            'prioritizePopular' => $prioritizePopular,
        ]);

        foreach ($books as $book) {
            if (! $this->checkRateLimit()) {
                Log::warning('[CatalogClassification] Rate limit reached, stopping batch');
                break;
            }

            try {
                $result = $this->classify($book);

                if ($result !== null) {
                    $stats['classified']++;
                } else {
                    $stats['skipped']++;
                }
            } catch (\Exception $e) {
                $stats['errors']++;
                Log::error('[CatalogClassification] Classification failed', [
                    'id' => $book->id,
                    'title' => $book->title,
                    'error' => $e->getMessage(),
                ]);
            }

            if ($stats['classified'] % $batchSize === 0) {
                Log::info('[CatalogClassification] Batch progress', [
                    'classified' => $stats['classified'],
                    'skipped' => $stats['skipped'],
                    'errors' => $stats['errors'],
                ]);
            }
        }

        Log::info('[CatalogClassification] Batch classification complete', $stats);

        return $stats;
    }

    /**
     * Get classification statistics for the catalog.
     *
     * @return array{total: int, classified: int, pending: int, percentage: float}
     */
    public function getStats(): array
    {
        $total = CatalogBook::count();
        $classified = CatalogBook::where('is_classified', true)->count();
        $pending = CatalogBook::pendingClassification()->count();

        return [
            'total' => $total,
            'classified' => $classified,
            'pending' => $pending,
            'percentage' => $total > 0 ? round(($classified / $total) * 100, 1) : 0,
        ];
    }

    /**
     * Check rate limit before making LLM call.
     */
    private function checkRateLimit(): bool
    {
        $maxAttempts = config('discovery.classification.rate_limit_per_minute', 30);

        if (RateLimiter::tooManyAttempts(self::RATE_LIMITER_KEY, $maxAttempts)) {
            $seconds = RateLimiter::availableIn(self::RATE_LIMITER_KEY);
            Log::debug('[CatalogClassification] Rate limited, waiting', ['seconds' => $seconds]);
            sleep(min($seconds, 60));
        }

        RateLimiter::hit(self::RATE_LIMITER_KEY, 60);

        return true;
    }
}
