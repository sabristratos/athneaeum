<?php

declare(strict_types=1);

namespace App\DTOs\Metadata;

/**
 * Raw metadata result from a single source.
 *
 * All fields are nullable since not all sources provide all data.
 * Tracks which source provided the data for provenance.
 */
final readonly class MetadataResultDTO
{
    public function __construct(
        public string $source,
        public bool $isIdentifierMatch,
        public ?string $title = null,
        public ?string $author = null,
        public ?string $description = null,
        public ?string $coverUrl = null,
        public ?int $pageCount = null,
        public ?string $publishedDate = null,
        public ?string $publisher = null,
        public ?string $isbn = null,
        public ?string $isbn13 = null,
        public ?array $genres = null,
        public ?string $seriesName = null,
        public ?int $volumeNumber = null,
        public ?string $language = null,
        public ?string $externalId = null,
        public ?string $workKey = null,
        public ?float $averageRating = null,
        public ?int $ratingsCount = null,
    ) {}

    /**
     * Check if a specific field has a value.
     */
    public function hasField(string $field): bool
    {
        if (!property_exists($this, $field)) {
            return false;
        }

        $value = $this->{$field};

        if ($value === null) {
            return false;
        }

        if (is_string($value) && $value === '') {
            return false;
        }

        if (is_array($value) && empty($value)) {
            return false;
        }

        return true;
    }

    /**
     * Get array of all non-null field names.
     */
    public function getPopulatedFields(): array
    {
        $fields = [];
        $excluded = ['source', 'isIdentifierMatch'];

        foreach (get_object_vars($this) as $key => $value) {
            if (in_array($key, $excluded, true)) {
                continue;
            }

            if ($this->hasField($key)) {
                $fields[] = $key;
            }
        }

        return $fields;
    }

    /**
     * Get the value of a field by name.
     */
    public function getField(string $field): mixed
    {
        return property_exists($this, $field) ? $this->{$field} : null;
    }
}
