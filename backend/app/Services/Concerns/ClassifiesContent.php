<?php

declare(strict_types=1);

namespace App\Services\Concerns;

use App\DTOs\Ingestion\ContentClassificationDTO;
use App\Enums\MoodEnum;
use App\Services\Ingestion\LLM\LLMConsultant;
use Illuminate\Database\Eloquent\Model;

/**
 * Trait for content classification functionality.
 *
 * Provides shared classification logic for both Book and CatalogBook models.
 * Classes using this trait must implement the abstract methods to define
 * model-specific behavior.
 */
trait ClassifiesContent
{
    protected LLMConsultant $llmConsultant;

    /**
     * Check if classification service is available.
     */
    public function isEnabled(): bool
    {
        return $this->llmConsultant->isEnabled();
    }

    /**
     * Check if a model can be classified (has description and not already classified).
     */
    public function canClassify(Model $model): bool
    {
        return ! empty($model->description) && ! $model->is_classified;
    }

    /**
     * Get classification result and apply it to the model.
     */
    protected function applyClassification(Model $model, ContentClassificationDTO $result): void
    {
        $updateData = [
            'audience' => $result->audience?->value ?? $result->audience,
            'intensity' => $result->intensity?->value ?? $result->intensity,
            'moods' => array_map(fn (MoodEnum $m) => $m->value, $result->moods),
            'classification_confidence' => $result->confidence,
            'is_classified' => true,
        ];

        if (method_exists($model, 'forceFill') && $model->isFillable('classified_at')) {
            $updateData['classified_at'] = now();
        }

        $model->update($updateData);
    }

    /**
     * Get genres from model in appropriate format for classification.
     */
    protected function getGenresForClassification(Model $model): array
    {
        if (method_exists($model, 'genreRelations') && $model->genreRelations) {
            return $model->genreRelations->pluck('name')->toArray();
        }

        return $model->genres ?? [];
    }
}
