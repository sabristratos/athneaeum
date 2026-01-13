<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Predefined genres for user preferences.
 *
 * Organized into Fiction, Non-Fiction, and Special categories
 * for easier display in the UI.
 */
enum GenreEnum: string
{
    // Fiction
    case Literary = 'literary';
    case Mystery = 'mystery';
    case Thriller = 'thriller';
    case Romance = 'romance';
    case ScienceFiction = 'science_fiction';
    case Fantasy = 'fantasy';
    case Horror = 'horror';
    case HistoricalFiction = 'historical_fiction';
    case Crime = 'crime';
    case Adventure = 'adventure';

    // Non-Fiction
    case Biography = 'biography';
    case Memoir = 'memoir';
    case History = 'history';
    case Science = 'science';
    case SelfHelp = 'self_help';
    case Business = 'business';
    case Philosophy = 'philosophy';
    case Travel = 'travel';
    case TrueCrime = 'true_crime';
    case Psychology = 'psychology';

    // Special
    case YoungAdult = 'young_adult';
    case Childrens = 'childrens';
    case GraphicNovel = 'graphic_novel';
    case Poetry = 'poetry';
    case Classics = 'classics';
    case ShortStories = 'short_stories';

    public function label(): string
    {
        return match ($this) {
            self::Literary => __('Literary Fiction'),
            self::Mystery => __('Mystery'),
            self::Thriller => __('Thriller'),
            self::Romance => __('Romance'),
            self::ScienceFiction => __('Science Fiction'),
            self::Fantasy => __('Fantasy'),
            self::Horror => __('Horror'),
            self::HistoricalFiction => __('Historical Fiction'),
            self::Crime => __('Crime'),
            self::Adventure => __('Adventure'),
            self::Biography => __('Biography'),
            self::Memoir => __('Memoir'),
            self::History => __('History'),
            self::Science => __('Science'),
            self::SelfHelp => __('Self-Help'),
            self::Business => __('Business'),
            self::Philosophy => __('Philosophy'),
            self::Travel => __('Travel'),
            self::TrueCrime => __('True Crime'),
            self::Psychology => __('Psychology'),
            self::YoungAdult => __('Young Adult'),
            self::Childrens => __("Children's"),
            self::GraphicNovel => __('Graphic Novel'),
            self::Poetry => __('Poetry'),
            self::Classics => __('Classics'),
            self::ShortStories => __('Short Stories'),
        };
    }

    public function category(): string
    {
        return match ($this) {
            self::Literary, self::Mystery, self::Thriller, self::Romance,
            self::ScienceFiction, self::Fantasy, self::Horror,
            self::HistoricalFiction, self::Crime, self::Adventure => 'fiction',

            self::Biography, self::Memoir, self::History, self::Science,
            self::SelfHelp, self::Business, self::Philosophy,
            self::Travel, self::TrueCrime, self::Psychology => 'nonfiction',

            self::YoungAdult, self::Childrens, self::GraphicNovel,
            self::Poetry, self::Classics, self::ShortStories => 'special',
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
            'category' => $case->category(),
        ])->all();
    }

    public static function groupedOptions(): array
    {
        $grouped = [
            'fiction' => [],
            'nonfiction' => [],
            'special' => [],
        ];

        foreach (self::cases() as $case) {
            $grouped[$case->category()][] = [
                'value' => $case->value,
                'label' => $case->label(),
            ];
        }

        return [
            ['key' => 'fiction', 'label' => __('Fiction'), 'genres' => $grouped['fiction']],
            ['key' => 'nonfiction', 'label' => __('Non-Fiction'), 'genres' => $grouped['nonfiction']],
            ['key' => 'special', 'label' => __('Special'), 'genres' => $grouped['special']],
        ];
    }
}
