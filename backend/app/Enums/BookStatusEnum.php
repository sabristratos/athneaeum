<?php

declare(strict_types=1);

namespace App\Enums;

enum BookStatusEnum: string
{
    case WantToRead = 'want_to_read';
    case Reading = 'reading';
    case Read = 'read';
    case Dnf = 'dnf';

    public function label(): string
    {
        return match ($this) {
            self::WantToRead => __('Want to Read'),
            self::Reading => __('Reading'),
            self::Read => __('Read'),
            self::Dnf => __('Did Not Finish'),
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
