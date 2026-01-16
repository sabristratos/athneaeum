<?php

declare(strict_types=1);

namespace App\DTOs\SeedData;

/**
 * Scored edition candidate from Open Library edition ranking.
 *
 * Contains all the metadata needed to evaluate and select
 * the best edition of a work for seed data.
 */
final readonly class EditionCandidateDTO
{
    public function __construct(
        public ?string $isbn13 = null,
        public ?string $isbn10 = null,
        public ?string $publisher = null,
        public ?string $format = null,
        public ?int $year = null,
        public ?int $coverId = null,
        public string $coverUrl = '',
        public string $editionKey = '',
        public int $score = 0,
        public array $scoreBreakdown = [],
        public bool $hasMultipleCovers = false,
    ) {}

    /**
     * Get the best ISBN available (prefer ISBN-13).
     */
    public function getBestIsbn(): ?string
    {
        return $this->isbn13 ?? $this->isbn10;
    }

    /**
     * Check if this edition has an ISBN.
     */
    public function hasIsbn(): bool
    {
        return $this->isbn13 !== null || $this->isbn10 !== null;
    }

    /**
     * Get a human-readable summary for debugging.
     */
    public function getSummary(): string
    {
        $parts = [];

        if ($this->publisher) {
            $parts[] = $this->publisher;
        }

        if ($this->year) {
            $parts[] = (string) $this->year;
        }

        if ($this->format) {
            $parts[] = $this->format;
        }

        $parts[] = "score: {$this->score}";

        if ($this->isbn13) {
            $parts[] = "ISBN-13: {$this->isbn13}";
        } elseif ($this->isbn10) {
            $parts[] = "ISBN-10: {$this->isbn10}";
        }

        return implode(' | ', $parts);
    }

    /**
     * Create from Open Library edition data.
     *
     * @param array<string, mixed> $edition
     * @param array<string, int> $scoreBreakdown
     */
    public static function fromOpenLibraryEdition(
        array $edition,
        string $coverUrl,
        int $score,
        array $scoreBreakdown = []
    ): self {
        $covers = $edition['covers'] ?? [];
        $coverId = ! empty($covers) && $covers[0] > 0 ? $covers[0] : null;

        return new self(
            isbn13: $edition['isbn_13'][0] ?? null,
            isbn10: $edition['isbn_10'][0] ?? null,
            publisher: $edition['publishers'][0] ?? null,
            format: $edition['physical_format'] ?? null,
            year: self::extractYear($edition['publish_date'] ?? ''),
            coverId: $coverId,
            coverUrl: $coverUrl,
            editionKey: $edition['key'] ?? '',
            score: $score,
            scoreBreakdown: $scoreBreakdown,
            hasMultipleCovers: count($covers) > 1,
        );
    }

    private static function extractYear(string $dateStr): ?int
    {
        if (preg_match('/\b(19|20)\d{2}\b/', $dateStr, $matches)) {
            return (int) $matches[0];
        }

        return null;
    }
}
