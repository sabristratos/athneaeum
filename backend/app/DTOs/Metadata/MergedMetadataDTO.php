<?php

declare(strict_types=1);

namespace App\DTOs\Metadata;

/**
 * The final merged metadata with field-level provenance.
 *
 * Tracks which source provided each field value for transparency
 * and debugging. Can be converted to the seed data format.
 */
final readonly class MergedMetadataDTO
{
    /**
     * @param  array<string, string>  $fieldSources  Map of field name to source name
     * @param  array<ScoredResultDTO>  $allResults  All scored results for reference
     */
    public function __construct(
        public ?string $title,
        public ?string $author,
        public ?string $description,
        public ?string $coverUrl,
        public ?string $coverUrlFallback,
        public ?int $pageCount,
        public ?string $publishedDate,
        public ?string $publisher,
        public ?string $isbn,
        public ?string $isbn13,
        public ?array $genres,
        public ?string $seriesName,
        public ?int $volumeNumber,
        public ?string $language,
        public ?float $averageRating,
        public ?int $ratingsCount,
        public array $fieldSources = [],
        public array $allResults = [],
        public float $confidence = 0.0,
    ) {}

    /**
     * Convert to seed data array format.
     */
    public function toSeedDataArray(): array
    {
        return [
            'isbn' => $this->isbn,
            'isbn13' => $this->isbn13,
            'title' => $this->title,
            'author' => $this->author,
            'description' => $this->description,
            'page_count' => $this->pageCount,
            'published_date' => $this->publishedDate,
            'publisher' => $this->publisher,
            'cover_url' => $this->coverUrl,
            'cover_url_fallback' => $this->coverUrlFallback,
            'series_name' => $this->seriesName,
            'volume_number' => $this->volumeNumber,
            'genres' => is_array($this->genres) ? implode(', ', $this->genres) : null,
            'rating' => $this->averageRating,
            'language' => $this->language,
        ];
    }

    /**
     * Get the source that provided a specific field.
     */
    public function getFieldSource(string $field): ?string
    {
        return $this->fieldSources[$field] ?? null;
    }

    /**
     * Check if the merged result has meaningful data.
     */
    public function hasData(): bool
    {
        return $this->title !== null || $this->isbn !== null || $this->isbn13 !== null;
    }

    /**
     * Get completeness score (0-100) based on populated fields.
     */
    public function getCompleteness(): float
    {
        $fields = [
            'title', 'author', 'description', 'coverUrl', 'pageCount',
            'publishedDate', 'publisher', 'isbn13', 'genres',
        ];

        $populated = 0;
        foreach ($fields as $field) {
            if ($this->{$field} !== null && $this->{$field} !== '' && $this->{$field} !== []) {
                $populated++;
            }
        }

        return ($populated / count($fields)) * 100;
    }

    /**
     * Create an empty result.
     */
    public static function empty(): self
    {
        return new self(
            title: null,
            author: null,
            description: null,
            coverUrl: null,
            coverUrlFallback: null,
            pageCount: null,
            publishedDate: null,
            publisher: null,
            isbn: null,
            isbn13: null,
            genres: null,
            seriesName: null,
            volumeNumber: null,
            language: null,
            averageRating: null,
            ratingsCount: null,
        );
    }
}
