<?php

declare(strict_types=1);

namespace App\DTOs\Ingestion;

use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use App\Enums\MoodEnum;

/**
 * Result of LLM content classification.
 *
 * Contains audience, intensity, and mood classifications
 * for filtering and recommendation purposes.
 */
class ContentClassificationDTO
{
    /**
     * @param  array<MoodEnum>  $moods
     */
    public function __construct(
        public ?AudienceEnum $audience = null,
        public ?ContentIntensityEnum $intensity = null,
        public array $moods = [],
        public float $confidence = 0.0,
    ) {}

    /**
     * Create from LLM response array.
     */
    public static function fromArray(array $data): self
    {
        $moods = [];
        foreach (($data['moods'] ?? []) as $moodValue) {
            $mood = MoodEnum::fromString($moodValue);
            if ($mood !== null) {
                $moods[] = $mood;
            }
        }

        return new self(
            audience: AudienceEnum::tryFrom($data['audience'] ?? '') ?? null,
            intensity: ContentIntensityEnum::tryFrom($data['intensity'] ?? '') ?? null,
            moods: $moods,
            confidence: (float) ($data['confidence'] ?? 0.0),
        );
    }

    /**
     * Convert to array for storage.
     */
    public function toArray(): array
    {
        return [
            'audience' => $this->audience?->value,
            'intensity' => $this->intensity?->value,
            'moods' => array_map(fn (MoodEnum $m) => $m->value, $this->moods),
            'confidence' => $this->confidence,
        ];
    }

    /**
     * Check if classification has meaningful data.
     */
    public function hasData(): bool
    {
        return $this->audience !== null
            || $this->intensity !== null
            || ! empty($this->moods);
    }
}
