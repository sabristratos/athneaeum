<?php

declare(strict_types=1);

namespace App\DTOs\Discovery;

/**
 * Represents book data for catalog ingestion.
 *
 * Handles parsing from various data sources (Kaggle CSV, etc.)
 * into a consistent format for the discovery catalog.
 */
class CatalogBookDTO
{
    public function __construct(
        public string $title,
        public ?string $author = null,
        public ?string $description = null,
        public ?array $genres = null,
        public ?int $pageCount = null,
        public ?string $publishedDate = null,
        public ?string $isbn = null,
        public ?string $isbn13 = null,
        public ?string $coverUrl = null,
        public ?int $reviewCount = null,
        public ?float $averageRating = null,
        public ?array $characters = null,
        public ?string $externalId = null,
        public string $externalProvider = 'kaggle',
    ) {}

    /**
     * Create DTO from Kaggle "Best Books Ever" dataset CSV row.
     *
     * Expected columns: title, series, author, rating, description, language,
     * isbn, genres, characters, bookFormat, edition, pages, publisher,
     * publishDate, firstPublishDate, awards, numRatings, ratingsByStars,
     * likedPercent, setting, bbeScore, bbeVotes, price
     */
    public static function fromKaggleRow(array $row): self
    {
        $title = self::cleanString($row['title'] ?? '');
        $author = self::cleanAuthor($row['author'] ?? null);
        $isbn = self::cleanIsbn($row['isbn'] ?? null);

        $externalId = $isbn ?? self::generateExternalId($title, $author);

        return new self(
            title: $title,
            author: $author,
            description: self::cleanString($row['description'] ?? null),
            genres: self::parseGenres($row['genres'] ?? null),
            pageCount: self::parseInt($row['pages'] ?? null),
            publishedDate: self::cleanString($row['publishDate'] ?? $row['firstPublishDate'] ?? null),
            isbn: $isbn,
            isbn13: null,
            coverUrl: null,
            reviewCount: self::parseInt($row['numRatings'] ?? null),
            averageRating: self::parseFloat($row['rating'] ?? null),
            characters: self::parseGenres($row['characters'] ?? null),
            externalId: $externalId,
            externalProvider: 'kaggle_bbe',
        );
    }

    /**
     * Generate a unique external ID from title and author.
     */
    private static function generateExternalId(?string $title, ?string $author): string
    {
        $normalized = mb_strtolower(trim(($title ?? '').'|'.($author ?? '')));

        return 'bbe_'.substr(md5($normalized), 0, 16);
    }

    /**
     * Clean author string by removing illustrator/contributor notes.
     */
    private static function cleanAuthor(?string $author): ?string
    {
        if ($author === null) {
            return null;
        }

        $author = preg_replace('/\s*\([^)]*\)\s*/', '', $author);
        $parts = explode(',', $author);

        return self::cleanString($parts[0] ?? $author);
    }

    /**
     * Create DTO from array (for testing or manual creation).
     */
    public static function fromArray(array $data): self
    {
        return new self(
            title: $data['title'] ?? '',
            author: $data['author'] ?? null,
            description: $data['description'] ?? null,
            genres: $data['genres'] ?? null,
            pageCount: $data['page_count'] ?? null,
            publishedDate: $data['published_date'] ?? null,
            isbn: $data['isbn'] ?? null,
            isbn13: $data['isbn13'] ?? null,
            coverUrl: $data['cover_url'] ?? null,
            reviewCount: $data['review_count'] ?? null,
            averageRating: $data['average_rating'] ?? null,
            characters: $data['characters'] ?? null,
            externalId: $data['external_id'] ?? null,
            externalProvider: $data['external_provider'] ?? 'manual',
        );
    }

    /**
     * Convert DTO to array for database insertion.
     */
    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'author' => $this->author,
            'description' => $this->description,
            'genres' => $this->genres,
            'page_count' => $this->pageCount,
            'published_date' => $this->parseDate($this->publishedDate),
            'isbn' => $this->isbn,
            'isbn13' => $this->isbn13,
            'cover_url' => $this->coverUrl,
            'review_count' => $this->reviewCount ?? 0,
            'average_rating' => $this->averageRating,
            'characters' => $this->characters,
            'external_id' => $this->externalId,
            'external_provider' => $this->externalProvider,
        ];
    }

    /**
     * Check if the DTO has minimum required data.
     */
    public function isValid(): bool
    {
        return ! empty($this->title);
    }

    /**
     * Parse genres from string or array.
     *
     * Handles Python-style arrays like "['Fantasy', 'Fiction']"
     * as well as JSON and comma-separated strings.
     */
    private static function parseGenres(mixed $genres): ?array
    {
        if ($genres === null) {
            return null;
        }

        if (is_array($genres)) {
            return array_filter($genres);
        }

        if (is_string($genres)) {
            $genres = trim($genres);
            if (empty($genres)) {
                return null;
            }

            if (str_starts_with($genres, '[')) {
                $jsonString = str_replace("'", '"', $genres);
                $decoded = json_decode($jsonString, true);
                if (is_array($decoded)) {
                    return array_filter($decoded);
                }
            }

            return array_filter(array_map('trim', explode(',', $genres)));
        }

        return null;
    }

    private static function cleanString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private static function cleanIsbn(?string $isbn): ?string
    {
        if ($isbn === null) {
            return null;
        }

        $isbn = preg_replace('/[^0-9X]/i', '', $isbn);

        return empty($isbn) ? null : $isbn;
    }

    private static function parseInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $int = (int) $value;

        return $int > 0 ? $int : null;
    }

    private static function parseFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $float = (float) $value;

        return $float > 0 ? $float : null;
    }

    private function parseDate(?string $date): ?string
    {
        if ($date === null) {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception) {
            return null;
        }
    }
}
