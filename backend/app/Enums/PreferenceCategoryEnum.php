<?php

declare(strict_types=1);

namespace App\Enums;

enum PreferenceCategoryEnum: string
{
    case Author = 'author';
    case Genre = 'genre';
    case Series = 'series';

    public function label(): string
    {
        return match ($this) {
            self::Author => __('Author'),
            self::Genre => __('Genre'),
            self::Series => __('Series'),
        };
    }

    /**
     * Get all categories as options for forms.
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return collect(self::cases())->map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ])->all();
    }
}
