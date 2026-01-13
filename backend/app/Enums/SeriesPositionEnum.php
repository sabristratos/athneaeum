<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Position hint for a book within a series.
 *
 * Used by LLM when extracting series information from descriptions.
 */
enum SeriesPositionEnum: string
{
    case First = 'first';
    case Middle = 'middle';
    case Conclusion = 'conclusion';
    case Standalone = 'standalone';
    case Prequel = 'prequel';
    case Spinoff = 'spinoff';

    public function label(): string
    {
        return match ($this) {
            self::First => __('First in Series'),
            self::Middle => __('Middle of Series'),
            self::Conclusion => __('Series Conclusion'),
            self::Standalone => __('Standalone'),
            self::Prequel => __('Prequel'),
            self::Spinoff => __('Spin-off'),
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
