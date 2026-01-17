<?php

declare(strict_types=1);

namespace App\DTOs\Discovery;

use Carbon\Carbon;

/**
 * Represents book data from NYT Bestseller lists.
 *
 * Handles parsing from CSV exports and NYT API responses
 * into a consistent format for catalog ingestion.
 */
class NYTBookDTO
{
    public function __construct(
        public string $isbn13,
        public string $title,
        public string $author,
        public ?string $description = null,
        public string $nytListCategory = '',
        public ?string $firstSeenDate = null,
        public ?string $coverUrl = null,
        public ?string $publisher = null,
        public ?int $rank = null,
        public ?int $weeksOnList = null,
    ) {}

    /**
     * Create DTO from CSV row.
     *
     * Expected columns: isbn13, title, author, description, nyt_list_category,
     * first_seen_date, cover_url, publisher, rank, weeks_on_list
     */
    public static function fromCsvRow(array $row): self
    {
        return new self(
            isbn13: self::cleanIsbn($row['isbn13'] ?? ''),
            title: self::cleanString($row['title'] ?? '') ?? '',
            author: self::cleanString($row['author'] ?? '') ?? '',
            description: self::cleanString($row['description'] ?? null),
            nytListCategory: self::cleanString($row['nyt_list_category'] ?? '') ?? '',
            firstSeenDate: self::cleanString($row['first_seen_date'] ?? null),
            coverUrl: self::cleanString($row['cover_url'] ?? null),
            publisher: self::cleanString($row['publisher'] ?? null),
            rank: self::parseInt($row['rank'] ?? null),
            weeksOnList: self::parseInt($row['weeks_on_list'] ?? null),
        );
    }

    /**
     * Create DTO from NYT Books API response.
     *
     * @param  array  $book  Single book from API response
     * @param  string  $listName  The bestseller list name
     * @param  string  $date  The bestseller list date
     */
    public static function fromApiResponse(array $book, string $listName, string $date): self
    {
        $isbn13 = $book['primary_isbn13'] ?? $book['isbns'][0]['isbn13'] ?? '';

        return new self(
            isbn13: self::cleanIsbn($isbn13),
            title: self::cleanString($book['title'] ?? '') ?? '',
            author: self::cleanString($book['author'] ?? $book['contributor'] ?? '') ?? '',
            description: self::cleanString($book['description'] ?? null),
            nytListCategory: $listName,
            firstSeenDate: $date,
            coverUrl: $book['book_image'] ?? null,
            publisher: self::cleanString($book['publisher'] ?? null),
            rank: self::parseInt($book['rank'] ?? null),
            weeksOnList: self::parseInt($book['weeks_on_list'] ?? null),
        );
    }

    /**
     * Convert to CatalogBookDTO for ingestion.
     */
    public function toCatalogBookDTO(): CatalogBookDTO
    {
        return new CatalogBookDTO(
            title: $this->title,
            author: $this->author,
            description: $this->description,
            genres: $this->inferGenresFromList(),
            pageCount: null,
            publishedDate: $this->firstSeenDate,
            isbn: null,
            isbn13: $this->isbn13,
            coverUrl: $this->coverUrl,
            reviewCount: null,
            averageRating: null,
            characters: null,
            externalId: $this->isbn13,
            externalProvider: 'nyt_bestseller',
        );
    }

    /**
     * Convert to array for direct database insertion.
     */
    public function toArray(): array
    {
        return [
            'isbn13' => $this->isbn13,
            'title' => $this->title,
            'author' => $this->author,
            'description' => $this->description,
            'nyt_list_category' => $this->nytListCategory,
            'first_seen_date' => $this->parseDate($this->firstSeenDate),
            'cover_url' => $this->coverUrl,
            'publisher' => $this->publisher,
            'rank' => $this->rank,
            'weeks_on_list' => $this->weeksOnList,
        ];
    }

    /**
     * Check if the DTO has minimum required data.
     */
    public function isValid(): bool
    {
        return ! empty($this->isbn13) && ! empty($this->title);
    }

    /**
     * Infer genre from NYT list category.
     *
     * @return array<string>
     */
    private function inferGenresFromList(): array
    {
        $category = strtolower($this->nytListCategory);

        if (str_contains($category, 'fiction')) {
            return ['Fiction'];
        }

        if (str_contains($category, 'nonfiction')) {
            return ['Non-Fiction'];
        }

        return [];
    }

    private static function cleanString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private static function cleanIsbn(?string $isbn): string
    {
        if ($isbn === null) {
            return '';
        }

        return preg_replace('/[^0-9]/', '', $isbn) ?? '';
    }

    private static function parseInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $int = (int) $value;

        return $int > 0 ? $int : null;
    }

    private function parseDate(?string $date): ?string
    {
        if ($date === null) {
            return null;
        }

        try {
            return Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception) {
            return null;
        }
    }
}
