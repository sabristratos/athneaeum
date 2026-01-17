<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Plot archetype classification for books.
 *
 * Identifies the core narrative structure or trope pattern.
 */
enum PlotArchetypeEnum: string
{
    case EnemiesToLovers = 'enemies_to_lovers';
    case ChosenOne = 'chosen_one';
    case Whodunit = 'whodunit';
    case UnreliableNarrator = 'unreliable_narrator';
    case FoundFamily = 'found_family';
    case ComingOfAge = 'coming_of_age';
    case FishOutOfWater = 'fish_out_of_water';
    case HerosJourney = 'heros_journey';
    case RedemptionArc = 'redemption_arc';
    case RagsToRiches = 'rags_to_riches';
    case RevengeTale = 'revenge_tale';
    case ForbiddenLove = 'forbidden_love';
    case TimeLoop = 'time_loop';
    case Ensemble = 'ensemble';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::EnemiesToLovers => __('Enemies to Lovers'),
            self::ChosenOne => __('Chosen One'),
            self::Whodunit => __('Whodunit'),
            self::UnreliableNarrator => __('Unreliable Narrator'),
            self::FoundFamily => __('Found Family'),
            self::ComingOfAge => __('Coming of Age'),
            self::FishOutOfWater => __('Fish Out of Water'),
            self::HerosJourney => __("Hero's Journey"),
            self::RedemptionArc => __('Redemption Arc'),
            self::RagsToRiches => __('Rags to Riches'),
            self::RevengeTale => __('Revenge Tale'),
            self::ForbiddenLove => __('Forbidden Love'),
            self::TimeLoop => __('Time Loop'),
            self::Ensemble => __('Ensemble'),
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
