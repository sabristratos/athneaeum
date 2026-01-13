<?php

declare(strict_types=1);

namespace App\DTOs\Ingestion;

/**
 * Result of the sanitization pipeline.
 *
 * Contains the cleaned book data plus any warnings or
 * decisions that need LLM resolution.
 */
class SanitizationResultDTO
{
    /**
     * @param  array<string>  $warnings  Non-fatal issues encountered
     * @param  array<array{type: string, data: mixed}>  $llmDecisions  Decisions requiring LLM
     */
    public function __construct(
        public CleanBookDTO $book,
        public array $warnings = [],
        public array $llmDecisions = [],
        public bool $needsReview = false,
        public bool $needsGenreEnrichment = false,
        public ?DescriptionAssessmentDTO $descriptionAssessment = null,
        public ?ContentClassificationDTO $contentClassification = null,
        public ?SeriesExtractionDTO $seriesExtraction = null,
    ) {}

    /**
     * Check if any LLM decisions are pending.
     */
    public function hasLLMDecisions(): bool
    {
        return ! empty($this->llmDecisions);
    }

    /**
     * Add a warning message.
     */
    public function addWarning(string $message): void
    {
        $this->warnings[] = $message;
    }

    /**
     * Add an LLM decision request.
     */
    public function addLLMDecision(string $type, mixed $data): void
    {
        $this->llmDecisions[] = ['type' => $type, 'data' => $data];
        $this->needsReview = true;
    }

    /**
     * Check if content classification data is available.
     */
    public function hasClassification(): bool
    {
        return $this->descriptionAssessment !== null
            || $this->contentClassification !== null
            || $this->seriesExtraction !== null;
    }

    /**
     * Check if description quality is poor or unusable.
     */
    public function hasDescriptionIssues(): bool
    {
        if ($this->descriptionAssessment === null) {
            return false;
        }

        return $this->descriptionAssessment->needsReview();
    }

    /**
     * Check if series info was extracted with high confidence.
     */
    public function hasSeriesInfo(float $threshold = 0.7): bool
    {
        if ($this->seriesExtraction === null) {
            return false;
        }

        return $this->seriesExtraction->hasConfidentSeriesInfo($threshold);
    }

    /**
     * Set classification results from LLM.
     */
    public function setClassifications(
        ?DescriptionAssessmentDTO $description,
        ?ContentClassificationDTO $content,
        ?SeriesExtractionDTO $series
    ): void {
        $this->descriptionAssessment = $description;
        $this->contentClassification = $content;
        $this->seriesExtraction = $series;

        if ($description?->needsReview()) {
            $this->needsReview = true;
        }
    }
}
