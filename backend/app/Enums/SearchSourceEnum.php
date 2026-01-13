<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Enum for book search source preferences.
 */
enum SearchSourceEnum: string
{
    case Google = 'google';
    case OPDS = 'opds';
    case Both = 'both';

    public function label(): string
    {
        return match ($this) {
            self::Google => __('Google Books'),
            self::OPDS => __('OPDS Catalog'),
            self::Both => __('Both Sources'),
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
