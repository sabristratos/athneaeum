<?php

declare(strict_types=1);

namespace App\Enums;

enum BookFormatEnum: string
{
    case Physical = 'physical';
    case Ebook = 'ebook';
    case Audiobook = 'audiobook';

    public function label(): string
    {
        return match ($this) {
            self::Physical => __('Physical'),
            self::Ebook => __('E-book'),
            self::Audiobook => __('Audiobook'),
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
