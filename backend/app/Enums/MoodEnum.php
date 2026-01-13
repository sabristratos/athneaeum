<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Mood/tone classification for books.
 *
 * Used by LLM to identify the dominant emotional tones.
 * Multiple moods can apply to a single book.
 */
enum MoodEnum: string
{
    case Adventurous = 'adventurous';
    case Romantic = 'romantic';
    case Suspenseful = 'suspenseful';
    case Humorous = 'humorous';
    case Melancholic = 'melancholic';
    case Inspirational = 'inspirational';
    case Mysterious = 'mysterious';
    case Cozy = 'cozy';
    case Tense = 'tense';
    case Thought_Provoking = 'thought_provoking';

    public function label(): string
    {
        return match ($this) {
            self::Adventurous => __('Adventurous'),
            self::Romantic => __('Romantic'),
            self::Suspenseful => __('Suspenseful'),
            self::Humorous => __('Humorous'),
            self::Melancholic => __('Melancholic'),
            self::Inspirational => __('Inspirational'),
            self::Mysterious => __('Mysterious'),
            self::Cozy => __('Cozy'),
            self::Tense => __('Tense'),
            self::Thought_Provoking => __('Thought-Provoking'),
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ])->all();
    }

    public static function fromString(string $value): ?self
    {
        $normalized = strtolower(trim($value));
        $normalized = str_replace(['-', ' '], '_', $normalized);

        foreach (self::cases() as $case) {
            if ($case->value === $normalized) {
                return $case;
            }
        }

        return null;
    }
}
