<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Interface for storing external media locally.
 *
 * Downloads images from external URLs and stores them locally
 * with optional thumbnail generation for faster serving.
 */
interface MediaStorageServiceInterface
{
    /**
     * Download and store media from an external URL.
     *
     * @param  string  $externalUrl  The external URL to download from
     * @param  string  $type  The media type (e.g., 'covers', 'authors')
     * @param  string  $identifier  Unique identifier for the file (e.g., ISBN, author key)
     * @return string|null The stored filename, or null on failure
     */
    public function store(string $externalUrl, string $type, string $identifier): ?string;

    /**
     * Get the public URL for stored media.
     *
     * @param  string  $type  The media type
     * @param  string|null  $filename  The stored filename
     * @param  string|null  $externalFallback  External URL to fall back to
     * @return string|null The URL to serve, or null if not found
     */
    public function getUrl(string $type, ?string $filename, ?string $externalFallback = null): ?string;

    /**
     * Get the thumbnail URL for stored media.
     *
     * @param  string  $type  The media type
     * @param  string|null  $filename  The stored filename
     * @param  string|null  $externalFallback  External URL to fall back to
     * @return string|null The thumbnail URL, or null if not found
     */
    public function getThumbnailUrl(string $type, ?string $filename, ?string $externalFallback = null): ?string;

    /**
     * Check if media exists locally.
     *
     * @param  string  $type  The media type
     * @param  string|null  $filename  The stored filename
     */
    public function exists(string $type, ?string $filename): bool;

    /**
     * Delete stored media and its thumbnails.
     *
     * @param  string  $type  The media type
     * @param  string|null  $filename  The stored filename
     */
    public function delete(string $type, ?string $filename): bool;
}
