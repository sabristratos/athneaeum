<?php

declare(strict_types=1);

namespace App\DTOs\Ingestion;

use Carbon\Carbon;

/**
 * Represents sanitized book data ready for database insertion.
 *
 * All validation has passed and data is normalized.
 * This DTO is the output of the sanitization pipeline.
 */
class CleanBookDTO
{
    /**
     * @param  array<AuthorDTO>  $authors
     * @param  array<string>  $rawGenres  Normalized genre strings for resolution by ingestion service
     */
    public function __construct(
        public string $title,
        public array $authors,
        public ?string $description = null,
        public array $rawGenres = [],
        public ?string $isbn = null,
        public ?string $isbn13 = null,
        public ?int $pageCount = null,
        public ?Carbon $publishedDate = null,
        public ?string $publisherName = null,
        public ?string $coverUrl = null,
        public ?string $externalId = null,
        public ?string $externalProvider = null,
        public ?int $seriesId = null,
        public ?string $seriesName = null,
        public ?int $volumeNumber = null,
        public ?float $heightCm = null,
        public ?float $widthCm = null,
        public ?float $thicknessCm = null,
        public ?string $language = null,
    ) {}

    /**
     * Get the primary author name for the denormalized author column.
     */
    public function getPrimaryAuthorName(): string
    {
        if (empty($this->authors)) {
            return 'Unknown Author';
        }

        $primaryAuthors = array_filter(
            $this->authors,
            fn (AuthorDTO $a) => $a->role === 'author'
        );

        if (empty($primaryAuthors)) {
            $primaryAuthors = $this->authors;
        }

        return implode(', ', array_map(fn (AuthorDTO $a) => $a->name, $primaryAuthors));
    }
}
