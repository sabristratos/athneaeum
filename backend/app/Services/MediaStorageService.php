<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\MediaStorageServiceInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

/**
 * Service for storing and serving external media locally.
 *
 * Handles downloading images from external APIs (Google Books, Open Library, etc.)
 * and storing them locally with thumbnails for efficient serving.
 */
class MediaStorageService implements MediaStorageServiceInterface
{
    private const DISK = 'public';

    private const QUALITY = 85;

    /**
     * Configuration for different media types.
     *
     * Each type defines:
     * - path: Storage directory
     * - thumb_path: Thumbnail storage directory
     * - max_width/max_height: Full-size image dimensions
     * - thumb_width/thumb_height: Thumbnail dimensions
     */
    private const TYPE_CONFIG = [
        'covers' => [
            'path' => 'media/covers',
            'thumb_path' => 'media/covers/thumbs',
            'max_width' => 400,
            'max_height' => 600,
            'thumb_width' => 100,
            'thumb_height' => 150,
        ],
        'authors' => [
            'path' => 'media/authors',
            'thumb_path' => 'media/authors/thumbs',
            'max_width' => 300,
            'max_height' => 300,
            'thumb_width' => 80,
            'thumb_height' => 80,
        ],
    ];

    private ImageManager $imageManager;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver);
    }

    public function store(string $externalUrl, string $type, string $identifier): ?string
    {
        $config = $this->getConfig($type);
        if (! $config) {
            Log::warning('[MediaStorage] Unknown media type', ['type' => $type]);

            return null;
        }

        try {
            $imageData = $this->downloadImage($externalUrl);
            if (! $imageData) {
                return null;
            }

            if (! $this->isValidImage($imageData)) {
                Log::warning('[MediaStorage] Invalid image data', [
                    'type' => $type,
                    'identifier' => $identifier,
                ]);

                return null;
            }

            $filename = $this->generateFilename($identifier);

            $fullPath = $this->processAndStore(
                $imageData,
                $filename,
                $config['path'],
                $config['max_width'],
                $config['max_height']
            );

            if (! $fullPath) {
                return null;
            }

            $this->processAndStore(
                $imageData,
                $filename,
                $config['thumb_path'],
                $config['thumb_width'],
                $config['thumb_height']
            );

            Log::info('[MediaStorage] Stored media successfully', [
                'type' => $type,
                'identifier' => $identifier,
                'filename' => $filename,
            ]);

            return $filename;
        } catch (\Exception $e) {
            Log::error('[MediaStorage] Exception storing media', [
                'type' => $type,
                'identifier' => $identifier,
                'url' => $externalUrl,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function getUrl(string $type, ?string $filename, ?string $externalFallback = null): ?string
    {
        $config = $this->getConfig($type);
        if (! $config) {
            return $externalFallback;
        }

        if ($filename && $this->exists($type, $filename)) {
            return Storage::disk(self::DISK)->url($config['path'].'/'.$filename);
        }

        return $externalFallback;
    }

    public function getThumbnailUrl(string $type, ?string $filename, ?string $externalFallback = null): ?string
    {
        $config = $this->getConfig($type);
        if (! $config) {
            return $externalFallback;
        }

        if ($filename) {
            $thumbPath = $config['thumb_path'].'/'.$filename;
            if (Storage::disk(self::DISK)->exists($thumbPath)) {
                return Storage::disk(self::DISK)->url($thumbPath);
            }
        }

        return $this->getUrl($type, $filename, $externalFallback);
    }

    public function exists(string $type, ?string $filename): bool
    {
        if (! $filename) {
            return false;
        }

        $config = $this->getConfig($type);
        if (! $config) {
            return false;
        }

        return Storage::disk(self::DISK)->exists($config['path'].'/'.$filename);
    }

    public function delete(string $type, ?string $filename): bool
    {
        if (! $filename) {
            return true;
        }

        $config = $this->getConfig($type);
        if (! $config) {
            return false;
        }

        $deleted = true;

        $fullPath = $config['path'].'/'.$filename;
        if (Storage::disk(self::DISK)->exists($fullPath)) {
            $deleted = Storage::disk(self::DISK)->delete($fullPath) && $deleted;
        }

        $thumbPath = $config['thumb_path'].'/'.$filename;
        if (Storage::disk(self::DISK)->exists($thumbPath)) {
            $deleted = Storage::disk(self::DISK)->delete($thumbPath) && $deleted;
        }

        return $deleted;
    }

    /**
     * Get storage statistics for a media type.
     */
    public function getStorageStats(string $type): array
    {
        $config = $this->getConfig($type);
        if (! $config) {
            return ['error' => 'Unknown type'];
        }

        $files = Storage::disk(self::DISK)->files($config['path']);

        $totalSize = 0;
        foreach ($files as $file) {
            $totalSize += Storage::disk(self::DISK)->size($file);
        }

        $count = count($files);

        return [
            'type' => $type,
            'total_files' => $count,
            'total_size_mb' => round($totalSize / 1024 / 1024, 2),
            'avg_size_kb' => $count > 0 ? round($totalSize / $count / 1024, 2) : 0,
        ];
    }

    private function getConfig(string $type): ?array
    {
        return self::TYPE_CONFIG[$type] ?? null;
    }

    private function downloadImage(string $url): ?string
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Athenaeum/1.0',
                ])
                ->get($url);

            if (! $response->successful()) {
                Log::warning('[MediaStorage] Failed to download image', [
                    'url' => $url,
                    'status' => $response->status(),
                ]);

                return null;
            }

            return $response->body();
        } catch (\Exception $e) {
            Log::warning('[MediaStorage] Download exception', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function isValidImage(string $data): bool
    {
        $signatures = [
            "\xFF\xD8\xFF" => 'jpeg',
            "\x89PNG\r\n\x1A\n" => 'png',
            'GIF87a' => 'gif',
            'GIF89a' => 'gif',
        ];

        foreach ($signatures as $signature => $type) {
            if (str_starts_with($data, $signature)) {
                return true;
            }
        }

        if (strlen($data) > 12 && substr($data, 0, 4) === 'RIFF' && substr($data, 8, 4) === 'WEBP') {
            return true;
        }

        return false;
    }

    private function generateFilename(string $identifier): string
    {
        $safe = Str::slug($identifier);

        return $safe.'.jpg';
    }

    private function processAndStore(
        string $imageData,
        string $filename,
        string $directory,
        int $maxWidth,
        int $maxHeight
    ): ?string {
        try {
            $image = $this->imageManager->read($imageData);

            $image->scaleDown($maxWidth, $maxHeight);

            $processed = $image->toJpeg(self::QUALITY);

            $path = $directory.'/'.$filename;

            Storage::disk(self::DISK)->put($path, (string) $processed);

            return $path;
        } catch (\Exception $e) {
            Log::error('[MediaStorage] Image processing failed', [
                'error' => $e->getMessage(),
                'directory' => $directory,
            ]);

            return null;
        }
    }
}
