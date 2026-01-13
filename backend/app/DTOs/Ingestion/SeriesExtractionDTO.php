<?php

declare(strict_types=1);

namespace App\DTOs\Ingestion;

use App\Enums\SeriesPositionEnum;

/**
 * Result of LLM series information extraction.
 *
 * Contains extracted series name and position hints
 * when title-based regex patterns fail.
 */
class SeriesExtractionDTO
{
    public function __construct(
        public bool $seriesMentioned = false,
        public ?string $seriesName = null,
        public ?SeriesPositionEnum $positionHint = null,
        public ?int $volumeHint = null,
        public float $confidence = 0.0,
    ) {}

    /**
     * Create from LLM response array.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            seriesMentioned: (bool) ($data['series_mentioned'] ?? false),
            seriesName: $data['series_name'] ?? null,
            positionHint: SeriesPositionEnum::tryFrom($data['position_hint'] ?? '') ?? null,
            volumeHint: isset($data['volume_hint']) ? (int) $data['volume_hint'] : null,
            confidence: (float) ($data['confidence'] ?? 0.0),
        );
    }

    /**
     * Convert to array for storage.
     */
    public function toArray(): array
    {
        return [
            'series_mentioned' => $this->seriesMentioned,
            'series_name' => $this->seriesName,
            'position_hint' => $this->positionHint?->value,
            'volume_hint' => $this->volumeHint,
            'confidence' => $this->confidence,
        ];
    }

    /**
     * Check if series information was found with sufficient confidence.
     */
    public function hasConfidentSeriesInfo(float $threshold = 0.7): bool
    {
        return $this->seriesMentioned
            && $this->seriesName !== null
            && $this->confidence >= $threshold;
    }
}
