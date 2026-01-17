<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * NYT Bestseller list categories.
 *
 * Represents the major NYT Books API list types tracked
 * for discovery and popularity signals.
 */
enum NYTListCategoryEnum: string
{
    case CombinedFiction = 'combined-print-and-e-book-fiction';
    case CombinedNonfiction = 'combined-print-and-e-book-nonfiction';
    case HardcoverFiction = 'hardcover-fiction';
    case HardcoverNonfiction = 'hardcover-nonfiction';
    case PaperbackFiction = 'paperback-trade-fiction';
    case PaperbackNonfiction = 'paperback-nonfiction';
    case YoungAdult = 'young-adult-hardcover';
    case ChildrenMiddleGrade = 'childrens-middle-grade-hardcover';
    case GraphicBooks = 'graphic-books-and-manga';
    case Audio = 'audio-fiction';

    /**
     * Get human-readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::CombinedFiction => __('Combined Print & E-Book Fiction'),
            self::CombinedNonfiction => __('Combined Print & E-Book Nonfiction'),
            self::HardcoverFiction => __('Hardcover Fiction'),
            self::HardcoverNonfiction => __('Hardcover Nonfiction'),
            self::PaperbackFiction => __('Paperback Trade Fiction'),
            self::PaperbackNonfiction => __('Paperback Nonfiction'),
            self::YoungAdult => __('Young Adult Hardcover'),
            self::ChildrenMiddleGrade => __("Children's Middle Grade"),
            self::GraphicBooks => __('Graphic Books & Manga'),
            self::Audio => __('Audio Fiction'),
        };
    }

    /**
     * Get short label for display.
     */
    public function shortLabel(): string
    {
        return match ($this) {
            self::CombinedFiction => __('Fiction'),
            self::CombinedNonfiction => __('Nonfiction'),
            self::HardcoverFiction => __('Hardcover Fiction'),
            self::HardcoverNonfiction => __('Hardcover Nonfiction'),
            self::PaperbackFiction => __('Paperback Fiction'),
            self::PaperbackNonfiction => __('Paperback Nonfiction'),
            self::YoungAdult => __('Young Adult'),
            self::ChildrenMiddleGrade => __('Middle Grade'),
            self::GraphicBooks => __('Graphic/Manga'),
            self::Audio => __('Audio'),
        };
    }

    /**
     * Check if this is a fiction list.
     */
    public function isFiction(): bool
    {
        return in_array($this, [
            self::CombinedFiction,
            self::HardcoverFiction,
            self::PaperbackFiction,
            self::Audio,
        ]);
    }

    /**
     * Check if this is a nonfiction list.
     */
    public function isNonfiction(): bool
    {
        return in_array($this, [
            self::CombinedNonfiction,
            self::HardcoverNonfiction,
            self::PaperbackNonfiction,
        ]);
    }

    /**
     * Get options array for frontend selects.
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

    /**
     * Get primary lists (most commonly tracked).
     *
     * @return array<self>
     */
    public static function primaryLists(): array
    {
        return [
            self::CombinedFiction,
            self::CombinedNonfiction,
            self::HardcoverFiction,
            self::HardcoverNonfiction,
            self::PaperbackFiction,
        ];
    }

    /**
     * Create from display name string.
     *
     * Handles various formats like "Combined Print & E-Book Fiction"
     * or "combined-print-and-e-book-fiction".
     */
    public static function fromString(string $value): ?self
    {
        if (empty($value)) {
            return null;
        }

        $normalized = strtolower(trim($value));

        foreach (self::cases() as $case) {
            if ($case->value === $normalized) {
                return $case;
            }

            $labelNormalized = strtolower($case->label());
            if ($labelNormalized === $normalized) {
                return $case;
            }
        }

        if (str_contains($normalized, 'fiction') && ! str_contains($normalized, 'non')) {
            if (str_contains($normalized, 'combined')) {
                return self::CombinedFiction;
            }
            if (str_contains($normalized, 'hardcover')) {
                return self::HardcoverFiction;
            }
            if (str_contains($normalized, 'paperback')) {
                return self::PaperbackFiction;
            }
        }

        if (str_contains($normalized, 'nonfiction') || str_contains($normalized, 'non-fiction')) {
            if (str_contains($normalized, 'combined')) {
                return self::CombinedNonfiction;
            }
            if (str_contains($normalized, 'hardcover')) {
                return self::HardcoverNonfiction;
            }
            if (str_contains($normalized, 'paperback')) {
                return self::PaperbackNonfiction;
            }
        }

        return null;
    }
}
