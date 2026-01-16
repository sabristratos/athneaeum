<?php

declare(strict_types=1);

namespace App\Contracts\Metadata;

use App\DTOs\Metadata\MetadataQueryDTO;
use App\DTOs\Metadata\MetadataResultDTO;

/**
 * Contract for metadata source implementations.
 *
 * Each source adapter wraps an external API and normalizes its output.
 * Sources implement identifier-first logic: ISBN lookup first,
 * then fuzzy title/author search as fallback.
 */
interface MetadataSourceInterface
{
    /**
     * Get the source identifier (e.g., 'open_library', 'google_books').
     */
    public function getSourceName(): string;

    /**
     * Get source priority (lower = higher priority, 1-100).
     */
    public function getPriority(): int;

    /**
     * Query the source for metadata.
     *
     * Uses ISBN if available (deterministic), otherwise title/author (fuzzy).
     */
    public function query(MetadataQueryDTO $query): ?MetadataResultDTO;

    /**
     * Check if source supports async/parallel queries.
     */
    public function supportsAsync(): bool;

    /**
     * Prepare an async request for use with Http::pool.
     *
     * Returns a callable that accepts Pool and returns PendingRequest,
     * or null if async is not supported.
     */
    public function prepareAsyncQuery(MetadataQueryDTO $query): ?callable;

    /**
     * Parse async response into MetadataResultDTO.
     */
    public function parseAsyncResponse(mixed $response): ?MetadataResultDTO;

    /**
     * Check if the source is available (API configured, not rate limited).
     */
    public function isAvailable(): bool;
}
