<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\Ingestion\RawBookDTO;
use App\Models\Book;

/**
 * Contract for the book ingestion service.
 *
 * This is the main entry point for all book data entering the system.
 * It orchestrates sanitization, entity resolution, and persistence.
 */
interface BookIngestionServiceInterface
{
    /**
     * Ingest raw book data and create/update a Book record.
     *
     * @param  RawBookDTO  $raw  The raw, unsanitized book data
     * @param  bool  $allowUpdate  Whether to update existing books (respects is_locked)
     * @return Book The created or updated book
     */
    public function ingest(RawBookDTO $raw, bool $allowUpdate = true): Book;

    /**
     * Ingest multiple books in batch.
     *
     * @param  array<RawBookDTO>  $rawBooks
     * @return array{books: array<Book>, errors: array<string>}
     */
    public function ingestBatch(array $rawBooks): array;

    /**
     * Update an existing book from external source data.
     *
     * Respects the is_locked flag - locked books will not be updated.
     *
     * @return Book The updated book (or unchanged if locked)
     */
    public function updateFromExternal(Book $book, RawBookDTO $raw): Book;
}
