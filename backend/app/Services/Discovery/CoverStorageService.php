<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use App\Contracts\Discovery\CoverStorageServiceInterface;
use App\Models\MasterBook;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

/**
 * Service for storing and serving book cover images locally.
 */
class CoverStorageService implements CoverStorageServiceInterface
{
    private const COVER_DISK = 'public';

    private const COVER_PATH = 'covers';

    private const THUMB_PATH = 'covers/thumbs';

    private const MAX_WIDTH = 400;

    private const MAX_HEIGHT = 600;

    private const THUMB_WIDTH = 100;

    private const THUMB_HEIGHT = 150;

    private const QUALITY = 85;

    private ImageManager $imageManager;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver);
    }

    /**
     * Download and store a cover image from an external URL.
     */
    public function store(string $externalUrl, MasterBook $book): ?string
    {
        try {
            // Download the image
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Athenaeum/1.0',
                ])
                ->get($externalUrl);

            if (! $response->successful()) {
                Log::warning('[CoverStorage] Failed to download cover', [
                    'book_id' => $book->id,
                    'url' => $externalUrl,
                    'status' => $response->status(),
                ]);

                return null;
            }

            $imageData = $response->body();
            $contentType = $response->header('Content-Type');

            // Validate it's actually an image
            if (! $this->isValidImage($contentType, $imageData)) {
                Log::warning('[CoverStorage] Invalid image data', [
                    'book_id' => $book->id,
                    'content_type' => $contentType,
                ]);

                return null;
            }

            // Generate filename based on ISBN or ID
            $filename = $this->generateFilename($book);

            // Process and store the main cover
            $coverPath = $this->processAndStore($imageData, $filename, self::COVER_PATH, self::MAX_WIDTH, self::MAX_HEIGHT);

            if (! $coverPath) {
                return null;
            }

            // Generate and store thumbnail
            $this->processAndStore($imageData, $filename, self::THUMB_PATH, self::THUMB_WIDTH, self::THUMB_HEIGHT);

            // Update book record
            $book->update([
                'cover_path' => $filename,
                'cover_fetched_at' => now(),
            ]);

            Log::info('[CoverStorage] Stored cover successfully', [
                'book_id' => $book->id,
                'filename' => $filename,
            ]);

            return $filename;
        } catch (\Exception $e) {
            Log::error('[CoverStorage] Exception storing cover', [
                'book_id' => $book->id,
                'url' => $externalUrl,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Get the URL for a book's cover image.
     */
    public function getUrl(MasterBook $book): ?string
    {
        // Prefer local cover
        if ($book->cover_path && $this->hasLocalCover($book)) {
            return Storage::disk(self::COVER_DISK)->url(self::COVER_PATH.'/'.$book->cover_path);
        }

        // Fall back to external URL
        return $book->cover_url_external;
    }

    /**
     * Get the thumbnail URL for a book's cover.
     */
    public function getThumbnailUrl(MasterBook $book): ?string
    {
        if ($book->cover_path) {
            $thumbPath = self::THUMB_PATH.'/'.$book->cover_path;
            if (Storage::disk(self::COVER_DISK)->exists($thumbPath)) {
                return Storage::disk(self::COVER_DISK)->url($thumbPath);
            }
        }

        // Fall back to main cover or external
        return $this->getUrl($book);
    }

    /**
     * Check if a book has a locally stored cover.
     */
    public function hasLocalCover(MasterBook $book): bool
    {
        if (! $book->cover_path) {
            return false;
        }

        return Storage::disk(self::COVER_DISK)->exists(self::COVER_PATH.'/'.$book->cover_path);
    }

    /**
     * Delete a stored cover and its thumbnails.
     */
    public function delete(MasterBook $book): bool
    {
        if (! $book->cover_path) {
            return true;
        }

        $deleted = true;

        // Delete main cover
        $coverPath = self::COVER_PATH.'/'.$book->cover_path;
        if (Storage::disk(self::COVER_DISK)->exists($coverPath)) {
            $deleted = Storage::disk(self::COVER_DISK)->delete($coverPath) && $deleted;
        }

        // Delete thumbnail
        $thumbPath = self::THUMB_PATH.'/'.$book->cover_path;
        if (Storage::disk(self::COVER_DISK)->exists($thumbPath)) {
            $deleted = Storage::disk(self::COVER_DISK)->delete($thumbPath) && $deleted;
        }

        if ($deleted) {
            $book->update([
                'cover_path' => null,
                'cover_fetched_at' => null,
            ]);
        }

        return $deleted;
    }

    /**
     * Get storage statistics.
     */
    public function getStorageStats(): array
    {
        $coverPath = self::COVER_PATH;
        $files = Storage::disk(self::COVER_DISK)->files($coverPath);

        $totalSize = 0;
        foreach ($files as $file) {
            $totalSize += Storage::disk(self::COVER_DISK)->size($file);
        }

        $count = count($files);

        return [
            'total_covers' => $count,
            'total_size_mb' => round($totalSize / 1024 / 1024, 2),
            'avg_size_kb' => $count > 0 ? round($totalSize / $count / 1024, 2) : 0,
        ];
    }

    /**
     * Generate a filename for a book's cover.
     */
    private function generateFilename(MasterBook $book): string
    {
        // Prefer ISBN13 for consistent naming
        if ($book->isbn13) {
            return $book->isbn13.'.jpg';
        }

        // Fall back to book ID
        return 'book_'.$book->id.'.jpg';
    }

    /**
     * Validate that the data is a valid image.
     */
    private function isValidImage(?string $contentType, string $data): bool
    {
        // Check content type
        $validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if ($contentType && ! in_array($contentType, $validTypes)) {
            return false;
        }

        // Check file signature
        $signatures = [
            "\xFF\xD8\xFF" => 'jpeg',
            "\x89PNG\r\n\x1A\n" => 'png',
            'GIF87a' => 'gif',
            'GIF89a' => 'gif',
            'RIFF' => 'webp',
        ];

        foreach ($signatures as $signature => $type) {
            if (str_starts_with($data, $signature)) {
                return true;
            }
        }

        // WebP has RIFF header then WEBP
        if (strlen($data) > 12 && substr($data, 0, 4) === 'RIFF' && substr($data, 8, 4) === 'WEBP') {
            return true;
        }

        return false;
    }

    /**
     * Process an image and store it.
     */
    private function processAndStore(
        string $imageData,
        string $filename,
        string $directory,
        int $maxWidth,
        int $maxHeight
    ): ?string {
        try {
            $image = $this->imageManager->read($imageData);

            // Resize if needed, maintaining aspect ratio
            $image->scaleDown($maxWidth, $maxHeight);

            // Convert to JPEG for consistency
            $processed = $image->toJpeg(self::QUALITY);

            $path = $directory.'/'.$filename;

            Storage::disk(self::COVER_DISK)->put($path, (string) $processed);

            return $path;
        } catch (\Exception $e) {
            Log::error('[CoverStorage] Image processing failed', [
                'error' => $e->getMessage(),
                'directory' => $directory,
            ]);

            return null;
        }
    }
}
