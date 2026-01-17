<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Prose style classification for books.
 *
 * Identifies the writing style and narrative approach.
 */
enum ProseStyleEnum: string
{
    case Flowery = 'flowery';
    case Minimalist = 'minimalist';
    case DialogueHeavy = 'dialogue_heavy';
    case Experimental = 'experimental';
    case Lyrical = 'lyrical';
    case Journalistic = 'journalistic';
    case Cinematic = 'cinematic';
    case StreamOfConsciousness = 'stream_of_consciousness';
    case Academic = 'academic';
    case Conversational = 'conversational';

    public function label(): string
    {
        return match ($this) {
            self::Flowery => __('Flowery'),
            self::Minimalist => __('Minimalist'),
            self::DialogueHeavy => __('Dialogue Heavy'),
            self::Experimental => __('Experimental'),
            self::Lyrical => __('Lyrical'),
            self::Journalistic => __('Journalistic'),
            self::Cinematic => __('Cinematic'),
            self::StreamOfConsciousness => __('Stream of Consciousness'),
            self::Academic => __('Academic'),
            self::Conversational => __('Conversational'),
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
