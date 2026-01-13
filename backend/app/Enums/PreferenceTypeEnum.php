<?php

declare(strict_types=1);

namespace App\Enums;

enum PreferenceTypeEnum: string
{
    case Favorite = 'favorite';
    case Exclude = 'exclude';

    public function label(): string
    {
        return match ($this) {
            self::Favorite => __('Favorite'),
            self::Exclude => __('Exclude'),
        };
    }

    /**
     * Get all types as options for forms.
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
