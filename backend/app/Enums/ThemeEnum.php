<?php

declare(strict_types=1);

namespace App\Enums;

enum ThemeEnum: string
{
    case Scholar = 'scholar';
    case Dreamer = 'dreamer';
    case Wanderer = 'wanderer';
    case Midnight = 'midnight';

    public function label(): string
    {
        return match ($this) {
            self::Scholar => __('Scholar'),
            self::Dreamer => __('Dreamer'),
            self::Wanderer => __('Wanderer'),
            self::Midnight => __('Midnight'),
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
