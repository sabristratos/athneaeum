<?php

declare(strict_types=1);

namespace App\DTOs\Ingestion;

/**
 * Represents a sanitized author ready for database lookup/creation.
 */
class AuthorDTO
{
    public function __construct(
        public string $name,
        public string $slug,
        public ?string $sortName = null,
        public string $role = 'author',
    ) {}

    /**
     * Create an unknown author placeholder.
     */
    public static function unknown(): self
    {
        return new self(
            name: 'Unknown Author',
            slug: 'unknown-author',
            sortName: 'Unknown Author',
            role: 'author',
        );
    }
}
