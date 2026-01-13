<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Quality assessment for book descriptions.
 *
 * Used by LLM to classify description quality
 * for filtering and review purposes.
 */
enum DescriptionQualityEnum: string
{
    case Good = 'good';
    case Fair = 'fair';
    case Poor = 'poor';

    public function label(): string
    {
        return match ($this) {
            self::Good => __('Good'),
            self::Fair => __('Fair'),
            self::Poor => __('Poor'),
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
