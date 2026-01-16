<?php

declare(strict_types=1);

namespace App\DTOs\Metadata;

/**
 * Input query for metadata lookup.
 *
 * Contains identifiers and search terms for querying metadata sources.
 * ISBN (if available) enables deterministic lookup; title/author is fuzzy.
 */
final readonly class MetadataQueryDTO
{
    public function __construct(
        public ?string $isbn = null,
        public ?string $isbn13 = null,
        public ?string $title = null,
        public ?string $author = null,
        public ?string $language = null,
        public ?int $publishYear = null,
    ) {}

    public function hasIsbn(): bool
    {
        return !empty($this->isbn) || !empty($this->isbn13);
    }

    public function getPrimaryIsbn(): ?string
    {
        return $this->isbn13 ?? $this->isbn;
    }

    public function hasTitleAuthor(): bool
    {
        return !empty($this->title);
    }

    /**
     * Create from a source book array (e.g., Kaggle CSV row).
     */
    public static function fromArray(array $data): self
    {
        $publishYear = null;
        if (isset($data['published_date']) && $data['published_date']) {
            $yearMatch = preg_match('/(\d{4})/', (string) $data['published_date'], $matches);
            $publishYear = $yearMatch ? (int) $matches[1] : null;
        }

        return new self(
            isbn: $data['isbn'] ?? null,
            isbn13: $data['isbn13'] ?? null,
            title: $data['title'] ?? null,
            author: $data['author'] ?? null,
            language: $data['language'] ?? null,
            publishYear: $publishYear,
        );
    }
}
