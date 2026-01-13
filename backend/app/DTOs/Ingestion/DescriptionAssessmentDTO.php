<?php

declare(strict_types=1);

namespace App\DTOs\Ingestion;

use App\Enums\DescriptionQualityEnum;

/**
 * Result of LLM description quality assessment.
 *
 * Contains quality flags to help determine if a description
 * is suitable for display or needs manual review.
 */
class DescriptionAssessmentDTO
{
    public function __construct(
        public DescriptionQualityEnum $quality,
        public bool $isUsable,
        public bool $isPromotional = false,
        public bool $isTruncated = false,
        public bool $hasSpoilers = false,
        public float $confidence = 0.0,
    ) {}

    /**
     * Create from LLM response array.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            quality: DescriptionQualityEnum::tryFrom($data['quality'] ?? 'fair') ?? DescriptionQualityEnum::Fair,
            isUsable: (bool) ($data['is_usable'] ?? true),
            isPromotional: (bool) ($data['is_promotional'] ?? false),
            isTruncated: (bool) ($data['is_truncated'] ?? false),
            hasSpoilers: (bool) ($data['has_spoilers'] ?? false),
            confidence: (float) ($data['confidence'] ?? 0.0),
        );
    }

    /**
     * Convert to array for storage.
     */
    public function toArray(): array
    {
        return [
            'quality' => $this->quality->value,
            'is_usable' => $this->isUsable,
            'is_promotional' => $this->isPromotional,
            'is_truncated' => $this->isTruncated,
            'has_spoilers' => $this->hasSpoilers,
            'confidence' => $this->confidence,
        ];
    }

    /**
     * Check if the description needs manual review.
     */
    public function needsReview(): bool
    {
        return ! $this->isUsable
            || $this->quality === DescriptionQualityEnum::Poor
            || $this->hasSpoilers;
    }
}
