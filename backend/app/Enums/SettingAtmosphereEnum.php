<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Setting atmosphere classification for books.
 *
 * Identifies the primary world-building and environmental tone.
 */
enum SettingAtmosphereEnum: string
{
    case Dystopian = 'dystopian';
    case SmallTown = 'small_town';
    case SpaceStation = 'space_station';
    case Victorian = 'victorian';
    case Cyberpunk = 'cyberpunk';
    case Medieval = 'medieval';
    case Contemporary = 'contemporary';
    case PostApocalyptic = 'post_apocalyptic';
    case Urban = 'urban';
    case Wilderness = 'wilderness';
    case Academic = 'academic';
    case Noir = 'noir';
    case Tropical = 'tropical';
    case Arctic = 'arctic';
    case Underwater = 'underwater';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Dystopian => __('Dystopian'),
            self::SmallTown => __('Small Town'),
            self::SpaceStation => __('Space Station'),
            self::Victorian => __('Victorian'),
            self::Cyberpunk => __('Cyberpunk'),
            self::Medieval => __('Medieval'),
            self::Contemporary => __('Contemporary'),
            self::PostApocalyptic => __('Post-Apocalyptic'),
            self::Urban => __('Urban'),
            self::Wilderness => __('Wilderness'),
            self::Academic => __('Academic'),
            self::Noir => __('Noir'),
            self::Tropical => __('Tropical'),
            self::Arctic => __('Arctic'),
            self::Underwater => __('Underwater'),
            self::Other => __('Other'),
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ])->all();
    }

    /**
     * Attempt to match from string, handling variations.
     */
    public static function fromString(string $value): ?self
    {
        $normalized = strtolower(trim($value));
        $normalized = str_replace([' ', '-'], '_', $normalized);

        return self::tryFrom($normalized);
    }
}
