<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\Ingestion\RawBookDTO;
use App\DTOs\Ingestion\SanitizationResultDTO;

/**
 * Contract for the data sanitization service.
 *
 * Level 1 (Code/Bouncer) cleaning - handles the majority of
 * sanitization using regex, string manipulation, and mapping tables.
 */
interface DataSanitizerInterface
{
    /**
     * Sanitize raw book data.
     *
     * @param  RawBookDTO  $raw  The raw, unsanitized book data
     * @param  string  $source  The source provider (google_books, goodreads, opds)
     * @return SanitizationResultDTO Sanitized data plus any LLM decisions needed
     */
    public function sanitize(RawBookDTO $raw, string $source = 'unknown'): SanitizationResultDTO;

    /**
     * Sanitize a title string.
     */
    public function sanitizeTitle(?string $title): string;

    /**
     * Sanitize a description string (strip HTML, decode entities).
     */
    public function sanitizeDescription(?string $description): ?string;
}
