<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Content intensity/darkness level for books.
 *
 * Used by LLM to classify how heavy or light the content is.
 * Helps users find books matching their current mood.
 */
enum ContentIntensityEnum: string
{
    case Light = 'light';
    case Moderate = 'moderate';
    case Dark = 'dark';
    case Intense = 'intense';

    public function label(): string
    {
        return match ($this) {
            self::Light => __('Light'),
            self::Moderate => __('Moderate'),
            self::Dark => __('Dark'),
            self::Intense => __('Intense'),
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Light => __('Uplifting, cozy, or humorous content'),
            self::Moderate => __('Balanced content with some tension'),
            self::Dark => __('Heavy themes, violence, or mature content'),
            self::Intense => __('Graphic content, extreme violence, or disturbing themes'),
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
            'description' => $case->description(),
        ])->all();
    }
}
