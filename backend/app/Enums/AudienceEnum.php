<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Target audience classification for books.
 *
 * Used by LLM to classify the intended reader demographic.
 */
enum AudienceEnum: string
{
    case Adult = 'adult';
    case YoungAdult = 'young_adult';
    case MiddleGrade = 'middle_grade';
    case Children = 'children';

    public function label(): string
    {
        return match ($this) {
            self::Adult => __('Adult'),
            self::YoungAdult => __('Young Adult'),
            self::MiddleGrade => __('Middle Grade'),
            self::Children => __('Children'),
        };
    }

    public function minAge(): int
    {
        return match ($this) {
            self::Adult => 18,
            self::YoungAdult => 13,
            self::MiddleGrade => 9,
            self::Children => 0,
        };
    }

    public function maxAge(): ?int
    {
        return match ($this) {
            self::Adult => null,
            self::YoungAdult => 17,
            self::MiddleGrade => 12,
            self::Children => 8,
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ])->all();
    }
}
