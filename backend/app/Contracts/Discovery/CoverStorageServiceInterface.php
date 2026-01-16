<?php

declare(strict_types=1);

namespace App\Contracts\Discovery;

use App\Models\MasterBook;

/**
 * Service for storing and serving book cover images locally.
 *
 * Replaces reliance on external cover URLs with local storage
 * for reliability and CDN control.
 */
interface CoverStorageServiceInterface
{
    /**
     * Download and store a cover image from an external URL.
     *
     * @param  string  $externalUrl  The external URL to download from
     * @param  MasterBook  $book  The book to store the cover for
     * @return string|null The local storage path, or null if failed
     */
    public function store(string $externalUrl, MasterBook $book): ?string;

    /**
     * Get the URL for a book's cover image.
     *
     * Returns local storage URL if available, otherwise falls back
     * to external URL.
     */
    public function getUrl(MasterBook $book): ?string;

    /**
     * Get the thumbnail URL for a book's cover.
     *
     * Thumbnails are smaller versions optimized for list views.
     */
    public function getThumbnailUrl(MasterBook $book): ?string;

    /**
     * Check if a book has a locally stored cover.
     */
    public function hasLocalCover(MasterBook $book): bool;

    /**
     * Delete a stored cover and its thumbnails.
     */
    public function delete(MasterBook $book): bool;

    /**
     * Get storage statistics.
     *
     * @return array{total_covers: int, total_size_mb: float, avg_size_kb: float}
     */
    public function getStorageStats(): array;
}
