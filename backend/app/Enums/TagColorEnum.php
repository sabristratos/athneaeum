<?php

declare(strict_types=1);

namespace App\Enums;

enum TagColorEnum: string
{
    case Primary = 'primary';
    case Gold = 'gold';
    case Green = 'green';
    case Purple = 'purple';
    case Copper = 'copper';
    case Blue = 'blue';
    case Orange = 'orange';
    case Teal = 'teal';
    case Rose = 'rose';
    case Slate = 'slate';

    public function label(): string
    {
        return match ($this) {
            self::Primary => __('Primary'),
            self::Gold => __('Gold'),
            self::Green => __('Green'),
            self::Purple => __('Purple'),
            self::Copper => __('Copper'),
            self::Blue => __('Blue'),
            self::Orange => __('Orange'),
            self::Teal => __('Teal'),
            self::Rose => __('Rose'),
            self::Slate => __('Slate'),
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
