<?php

declare(strict_types=1);

namespace App\DTOs\Ingestion;

use App\Enums\PlotArchetypeEnum;
use App\Enums\ProseStyleEnum;
use App\Enums\SettingAtmosphereEnum;

/**
 * Result of LLM vibe classification.
 *
 * Contains reading experience characteristics for recommendation
 * matching: mood darkness, pacing, complexity, emotional intensity,
 * and categorical classifications.
 */
class VibeClassificationDTO
{
    public function __construct(
        public ?float $moodDarkness = null,
        public ?float $pacingSpeed = null,
        public ?float $complexityScore = null,
        public ?float $emotionalIntensity = null,
        public ?PlotArchetypeEnum $plotArchetype = null,
        public ?ProseStyleEnum $proseStyle = null,
        public ?SettingAtmosphereEnum $settingAtmosphere = null,
        public float $confidence = 0.0,
    ) {}

    /**
     * Create from LLM response array.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            moodDarkness: self::parseVibeScore($data['mood_darkness'] ?? null),
            pacingSpeed: self::parseVibeScore($data['pacing_speed'] ?? null),
            complexityScore: self::parseVibeScore($data['complexity_score'] ?? null),
            emotionalIntensity: self::parseVibeScore($data['emotional_intensity'] ?? null),
            plotArchetype: PlotArchetypeEnum::fromString(self::extractString($data['plot_archetype'] ?? '')),
            proseStyle: ProseStyleEnum::fromString(self::extractString($data['prose_style'] ?? '')),
            settingAtmosphere: SettingAtmosphereEnum::fromString(self::extractString($data['setting_atmosphere'] ?? '')),
            confidence: (float) ($data['confidence'] ?? 0.0),
        );
    }

    /**
     * Extract a string value, handling arrays from LLM responses.
     */
    private static function extractString(mixed $value): string
    {
        if (is_array($value)) {
            return (string) ($value[0] ?? '');
        }

        return (string) $value;
    }

    /**
     * Convert to array for storage.
     */
    public function toArray(): array
    {
        return [
            'mood_darkness' => $this->moodDarkness,
            'pacing_speed' => $this->pacingSpeed,
            'complexity_score' => $this->complexityScore,
            'emotional_intensity' => $this->emotionalIntensity,
            'plot_archetype' => $this->plotArchetype?->value,
            'prose_style' => $this->proseStyle?->value,
            'setting_atmosphere' => $this->settingAtmosphere?->value,
            'confidence' => $this->confidence,
        ];
    }

    /**
     * Check if classification has meaningful data.
     */
    public function hasData(): bool
    {
        return $this->moodDarkness !== null
            || $this->pacingSpeed !== null
            || $this->complexityScore !== null
            || $this->emotionalIntensity !== null
            || $this->plotArchetype !== null
            || $this->proseStyle !== null
            || $this->settingAtmosphere !== null;
    }

    /**
     * Check if all vibe vectors are populated.
     */
    public function hasCompleteVectors(): bool
    {
        return $this->moodDarkness !== null
            && $this->pacingSpeed !== null
            && $this->complexityScore !== null
            && $this->emotionalIntensity !== null;
    }

    /**
     * Get human-readable pacing label for embedding text.
     */
    public function getPacingLabel(): string
    {
        if ($this->pacingSpeed === null) {
            return '';
        }

        return match (true) {
            $this->pacingSpeed <= 3.0 => 'slow burn',
            $this->pacingSpeed <= 6.0 => 'moderate pace',
            default => 'fast-paced thriller',
        };
    }

    /**
     * Get human-readable mood label for embedding text.
     */
    public function getMoodLabel(): string
    {
        if ($this->moodDarkness === null) {
            return '';
        }

        return match (true) {
            $this->moodDarkness <= 3.0 => 'light and cozy',
            $this->moodDarkness <= 6.0 => 'balanced',
            default => 'dark and intense',
        };
    }

    /**
     * Get human-readable complexity label for embedding text.
     */
    public function getComplexityLabel(): string
    {
        if ($this->complexityScore === null) {
            return '';
        }

        return match (true) {
            $this->complexityScore <= 3.0 => 'easy read',
            $this->complexityScore <= 6.0 => 'moderate complexity',
            default => 'dense and literary',
        };
    }

    /**
     * Get human-readable emotional intensity label for embedding text.
     */
    public function getEmotionalLabel(): string
    {
        if ($this->emotionalIntensity === null) {
            return '';
        }

        return match (true) {
            $this->emotionalIntensity <= 3.0 => 'detached',
            $this->emotionalIntensity <= 6.0 => 'emotionally balanced',
            default => 'emotional tearjerker',
        };
    }

    /**
     * Parse and clamp vibe score to valid range (1.0-10.0).
     */
    private static function parseVibeScore(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $score = (float) $value;

        return max(1.0, min(10.0, round($score, 1)));
    }
}
