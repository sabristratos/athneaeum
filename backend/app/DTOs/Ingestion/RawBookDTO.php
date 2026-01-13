<?php

declare(strict_types=1);

namespace App\DTOs\Ingestion;

/**
 * Represents raw, unsanitized book data from any external source.
 *
 * All fields are nullable to handle dirty or incomplete data.
 * This DTO is the input to the sanitization pipeline.
 */
class RawBookDTO
{
    public function __construct(
        public ?string $title = null,
        public ?string $author = null,
        public ?string $description = null,
        public ?array $genres = null,
        public ?string $isbn = null,
        public ?string $isbn13 = null,
        public ?int $pageCount = null,
        public ?string $publishedDate = null,
        public ?string $publisher = null,
        public ?string $coverUrl = null,
        public ?string $externalId = null,
        public ?string $externalProvider = null,
        public ?string $seriesName = null,
        public ?int $volumeNumber = null,
        public ?float $heightCm = null,
        public ?float $widthCm = null,
        public ?float $thicknessCm = null,
        public ?float $averageRating = null,
        public ?int $ratingsCount = null,
        public ?string $language = null,
    ) {}

    /**
     * Create DTO from Google Books API response.
     */
    public static function fromGoogleBooks(array $data): self
    {
        return new self(
            title: $data['title'] ?? null,
            author: $data['author'] ?? null,
            description: $data['description'] ?? null,
            genres: $data['genres'] ?? null,
            isbn: $data['isbn'] ?? null,
            isbn13: $data['isbn13'] ?? null,
            pageCount: isset($data['page_count']) ? (int) $data['page_count'] : null,
            publishedDate: $data['published_date'] ?? null,
            publisher: $data['publisher'] ?? null,
            coverUrl: $data['cover_url'] ?? null,
            externalId: $data['external_id'] ?? null,
            externalProvider: 'google_books',
            seriesName: $data['series_name'] ?? null,
            volumeNumber: isset($data['volume_number']) ? (int) $data['volume_number'] : null,
            heightCm: isset($data['height_cm']) ? (float) $data['height_cm'] : null,
            widthCm: isset($data['width_cm']) ? (float) $data['width_cm'] : null,
            thicknessCm: isset($data['thickness_cm']) ? (float) $data['thickness_cm'] : null,
            averageRating: isset($data['average_rating']) ? (float) $data['average_rating'] : null,
            ratingsCount: isset($data['ratings_count']) ? (int) $data['ratings_count'] : null,
            language: $data['language'] ?? null,
        );
    }

    /**
     * Create DTO from Goodreads CSV row.
     */
    public static function fromGoodreadsRow(array $row, array $columnMap): self
    {
        $getValue = fn (string $col) => isset($columnMap[$col]) ? trim($row[$columnMap[$col]] ?? '') : null;

        return new self(
            title: $getValue('Title') ?: null,
            author: $getValue('Author') ?: null,
            description: null,
            genres: null,
            isbn: self::cleanIsbn($getValue('ISBN')),
            isbn13: self::cleanIsbn($getValue('ISBN13')),
            pageCount: ($p = $getValue('Number of Pages')) ? (int) $p : null,
            publishedDate: $getValue('Year Published') ?: $getValue('Original Publication Year'),
            publisher: $getValue('Publisher') ?: null,
            coverUrl: null,
            externalId: $getValue('Book Id') ?: null,
            externalProvider: 'goodreads',
            seriesName: null,
            volumeNumber: null,
            heightCm: null,
            widthCm: null,
            thicknessCm: null,
            averageRating: ($r = $getValue('Average Rating')) ? (float) $r : null,
            ratingsCount: null,
            language: null,
        );
    }

    /**
     * Create DTO from OPDS catalog entry.
     */
    public static function fromOpds(array $data): self
    {
        return new self(
            title: $data['title'] ?? null,
            author: $data['author'] ?? null,
            description: $data['description'] ?? null,
            genres: $data['genres'] ?? $data['categories'] ?? null,
            isbn: $data['isbn'] ?? null,
            isbn13: null,
            pageCount: null,
            publishedDate: $data['published_date'] ?? null,
            publisher: $data['publisher'] ?? null,
            coverUrl: $data['cover_url'] ?? null,
            externalId: $data['external_id'] ?? null,
            externalProvider: 'opds',
            seriesName: $data['series_name'] ?? null,
            volumeNumber: isset($data['volume_number']) ? (int) $data['volume_number'] : null,
            heightCm: null,
            widthCm: null,
            thicknessCm: null,
            averageRating: null,
            ratingsCount: null,
            language: $data['language'] ?? null,
        );
    }

    /**
     * Create DTO from validated request data.
     */
    public static function fromRequest(array $validated): self
    {
        return new self(
            title: $validated['title'] ?? null,
            author: $validated['author'] ?? null,
            description: $validated['description'] ?? null,
            genres: $validated['genres'] ?? null,
            isbn: $validated['isbn'] ?? null,
            isbn13: $validated['isbn13'] ?? null,
            pageCount: isset($validated['page_count']) ? (int) $validated['page_count'] : null,
            publishedDate: $validated['published_date'] ?? null,
            publisher: $validated['publisher'] ?? null,
            coverUrl: $validated['cover_url'] ?? null,
            externalId: $validated['external_id'] ?? null,
            externalProvider: $validated['external_provider'] ?? null,
            seriesName: $validated['series_name'] ?? null,
            volumeNumber: isset($validated['volume_number']) ? (int) $validated['volume_number'] : null,
            heightCm: isset($validated['height_cm']) ? (float) $validated['height_cm'] : null,
            widthCm: isset($validated['width_cm']) ? (float) $validated['width_cm'] : null,
            thicknessCm: isset($validated['thickness_cm']) ? (float) $validated['thickness_cm'] : null,
            averageRating: isset($validated['average_rating']) ? (float) $validated['average_rating'] : null,
            ratingsCount: isset($validated['ratings_count']) ? (int) $validated['ratings_count'] : null,
            language: $validated['language'] ?? null,
        );
    }

    /**
     * Clean ISBN from Goodreads format (may have quotes or equals signs).
     */
    private static function cleanIsbn(?string $isbn): ?string
    {
        if (empty($isbn)) {
            return null;
        }

        $cleaned = preg_replace('/[=""\s]/', '', $isbn);

        return ! empty($cleaned) ? $cleaned : null;
    }
}
