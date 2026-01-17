<?php

declare(strict_types=1);

namespace App\Services\SeedData;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

/**
 * Service for managing seed data CSV files and media assets.
 *
 * Handles reading/writing CSVs and downloading media to the seeders/data directory
 * for use in database seeding after development resets.
 */
class SeedDataService
{
    private const BASE_PATH = 'database/seeders/data';

    private const TRACKING_FILE = 'database/seeders/data/.tracking.json';

    /**
     * MD5 hashes of known placeholder images to reject.
     *
     * These are "image not available" placeholders from Open Library and other sources.
     */
    private const PLACEHOLDER_HASHES = [
        '6f6a63d1c5c7c9a7b9f8a5e7a1c3d5b7', // Open Library placeholder (sample)
        'a1d0c6e83f027327d8461063f4ac58a6', // Common 1x1 pixel transparent
    ];

    private const PATHS = [
        'books' => [
            'csv' => 'books/books.csv',
            'media' => 'books/covers',
        ],
        'authors' => [
            'csv' => 'authors/authors.csv',
            'media' => 'authors/photos',
        ],
        'series' => [
            'csv' => 'series/series.csv',
            'media' => null,
        ],
        'genres' => [
            'csv' => 'genres/genres.csv',
            'media' => null,
        ],
        'catalog' => [
            'csv' => 'catalog/catalog_books.csv',
            'media' => 'catalog/covers',
        ],
        'goodreads' => [
            'csv' => 'goodreads/goodreads_books.csv',
            'media' => 'goodreads/covers',
        ],
    ];

    private const IMAGE_CONFIG = [
        'books' => ['max_width' => 400, 'max_height' => 600],
        'authors' => ['max_width' => 300, 'max_height' => 300],
        'catalog' => ['max_width' => 400, 'max_height' => 600],
        'goodreads' => ['max_width' => 400, 'max_height' => 600],
    ];

    private ?ImageManager $imageManager = null;

    /**
     * Get the image manager instance (lazy loaded).
     */
    private function getImageManager(): ImageManager
    {
        if ($this->imageManager === null) {
            $this->imageManager = new ImageManager(new Driver);
        }

        return $this->imageManager;
    }

    /**
     * Get the full path to a seed data file or directory.
     */
    public function getPath(string $type, string $key = 'csv'): string
    {
        $relativePath = self::PATHS[$type][$key] ?? throw new \InvalidArgumentException("Unknown path: {$type}.{$key}");

        return base_path(self::BASE_PATH.'/'.$relativePath);
    }

    /**
     * Get the base seed data path.
     */
    public function getBasePath(): string
    {
        return base_path(self::BASE_PATH);
    }

    /**
     * Read a CSV file and return an array of associative arrays.
     *
     * @return array<int, array<string, string>>
     */
    public function readCsv(string $type): array
    {
        $path = $this->getPath($type, 'csv');

        if (! file_exists($path)) {
            return [];
        }

        $rows = [];
        $handle = fopen($path, 'r');

        if ($handle === false) {
            throw new \RuntimeException("Cannot open CSV: {$path}");
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);

            return [];
        }

        while (($data = fgetcsv($handle)) !== false) {
            if (count($data) === count($headers)) {
                $rows[] = array_combine($headers, $data);
            }
        }

        fclose($handle);

        return $rows;
    }

    /**
     * Write data to a CSV file.
     *
     * @param  array<int, array<string, mixed>>  $data
     * @param  array<string>|null  $headers  Optional headers (auto-detected if null)
     */
    public function writeCsv(string $type, array $data, ?array $headers = null): int
    {
        if (empty($data)) {
            return 0;
        }

        $path = $this->getPath($type, 'csv');
        $directory = dirname($path);

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $headers = $headers ?? array_keys($data[0]);

        $handle = fopen($path, 'w');

        if ($handle === false) {
            throw new \RuntimeException("Cannot create CSV: {$path}");
        }

        fputcsv($handle, $headers);

        $count = 0;
        foreach ($data as $row) {
            $csvRow = [];
            foreach ($headers as $header) {
                $value = $row[$header] ?? '';
                $csvRow[] = is_array($value) ? json_encode($value) : (string) $value;
            }
            fputcsv($handle, $csvRow);
            $count++;
        }

        fclose($handle);

        return $count;
    }

    /**
     * Append rows to an existing CSV file.
     *
     * @param  array<int, array<string, mixed>>  $data
     */
    public function appendCsv(string $type, array $data): int
    {
        if (empty($data)) {
            return 0;
        }

        $path = $this->getPath($type, 'csv');
        $existingData = $this->readCsv($type);

        $headers = ! empty($existingData) ? array_keys($existingData[0]) : array_keys($data[0]);

        $handle = fopen($path, 'a');

        if ($handle === false) {
            throw new \RuntimeException("Cannot append to CSV: {$path}");
        }

        if (empty($existingData)) {
            fputcsv($handle, $headers);
        }

        $count = 0;
        foreach ($data as $row) {
            $csvRow = [];
            foreach ($headers as $header) {
                $value = $row[$header] ?? '';
                $csvRow[] = is_array($value) ? json_encode($value) : (string) $value;
            }
            fputcsv($handle, $csvRow);
            $count++;
        }

        fclose($handle);

        return $count;
    }

    /**
     * Download and store an image for seed data.
     *
     * @return string|null The filename if successful, null otherwise
     */
    public function downloadMedia(string $type, string $url, string $identifier): ?string
    {
        $mediaPath = self::PATHS[$type]['media'] ?? null;

        if (! $mediaPath) {
            return null;
        }

        $directory = base_path(self::BASE_PATH.'/'.$mediaPath);

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $filename = Str::slug($identifier).'.jpg';
        $fullPath = $directory.'/'.$filename;

        if (file_exists($fullPath)) {
            return $filename;
        }

        try {
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get($url);

            if (! $response->successful()) {
                Log::warning('[SeedData] Failed to download image', [
                    'type' => $type,
                    'url' => $url,
                    'status' => $response->status(),
                ]);

                return null;
            }

            $imageData = $response->body();

            if (! $this->isValidImage($imageData)) {
                Log::warning('[SeedData] Invalid image data', [
                    'type' => $type,
                    'identifier' => $identifier,
                ]);

                return null;
            }

            if ($this->isPlaceholderImage($imageData)) {
                Log::warning('[SeedData] Rejected known placeholder image (hash match)', [
                    'type' => $type,
                    'identifier' => $identifier,
                    'hash' => md5($imageData),
                ]);

                return null;
            }

            $config = self::IMAGE_CONFIG[$type] ?? ['max_width' => 400, 'max_height' => 600];

            $image = $this->getImageManager()->read($imageData);

            $width = $image->width();
            $height = $image->height();

            if ($width < 150 || $height < 200) {
                Log::warning('[SeedData] Image too small for book cover', [
                    'type' => $type,
                    'identifier' => $identifier,
                    'width' => $width,
                    'height' => $height,
                    'hash' => md5($imageData),
                ]);

                return null;
            }

            $image->scaleDown($config['max_width'], $config['max_height']);

            $processed = $image->toJpeg(85);
            file_put_contents($fullPath, (string) $processed);

            Log::info('[SeedData] Downloaded media', [
                'type' => $type,
                'identifier' => $identifier,
                'filename' => $filename,
            ]);

            return $filename;

        } catch (\Exception $e) {
            Log::error('[SeedData] Download exception', [
                'type' => $type,
                'identifier' => $identifier,
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Check if media file exists.
     */
    public function mediaExists(string $type, string $identifier): bool
    {
        $mediaPath = self::PATHS[$type]['media'] ?? null;

        if (! $mediaPath) {
            return false;
        }

        $filename = Str::slug($identifier).'.jpg';
        $fullPath = base_path(self::BASE_PATH.'/'.$mediaPath.'/'.$filename);

        return file_exists($fullPath);
    }

    /**
     * Check if a cover already exists for the given identifier.
     *
     * Checks for multiple image extensions (jpg, jpeg, png, webp).
     *
     * @return string|null The filename if exists, null if not
     */
    public function coverExists(string $type, string $identifier): ?string
    {
        $mediaPath = self::PATHS[$type]['media'] ?? null;

        if (! $mediaPath) {
            return null;
        }

        $directory = base_path(self::BASE_PATH.'/'.$mediaPath);
        $baseFilename = Str::slug($identifier);
        $extensions = ['jpg', 'jpeg', 'png', 'webp'];

        foreach ($extensions as $ext) {
            $filename = "{$baseFilename}.{$ext}";
            $fullPath = "{$directory}/{$filename}";

            if (file_exists($fullPath)) {
                return $filename;
            }
        }

        return null;
    }

    /**
     * Save a single book to CSV (incremental, atomic write).
     *
     * Reads existing CSV, updates/adds the book by identifier key, and writes atomically.
     * This prevents data loss if the process is interrupted.
     *
     * @param  array<string>  $headers  CSV column headers
     * @param  string  $identifierKey  The array key used to identify unique records
     */
    public function saveBookToCsv(string $type, array $book, array $headers, string $identifierKey): bool
    {
        $csvPath = $this->getPath($type, 'csv');
        $directory = dirname($csvPath);

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $existingBooks = $this->readCsv($type);

        usleep(50000);

        $booksByKey = [];
        foreach ($existingBooks as $existing) {
            $key = ! empty($existing[$identifierKey])
                ? $existing[$identifierKey]
                : Str::slug(($existing['title'] ?? 'unknown').'-'.($existing['author'] ?? ''));
            $booksByKey[$key] = $existing;
        }

        $key = ! empty($book[$identifierKey])
            ? $book[$identifierKey]
            : Str::slug(($book['title'] ?? 'unknown').'-'.($book['author'] ?? ''));
        $booksByKey[$key] = $book;

        $content = $this->buildCsvContent($headers, $booksByKey);

        $maxRetries = 5;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            $result = @file_put_contents($csvPath, $content, LOCK_EX);

            if ($result !== false) {
                return true;
            }

            usleep(100000 * $attempt);
        }

        Log::error('[SeedData] Failed to save CSV after retries', [
            'path' => $csvPath,
            'attempts' => $maxRetries,
        ]);

        return false;
    }

    /**
     * Build CSV content string from headers and data.
     *
     * @param  array<string>  $headers
     * @param  array<string, array<string, mixed>>  $data
     */
    private function buildCsvContent(array $headers, array $data): string
    {
        $output = fopen('php://temp', 'r+');
        fputcsv($output, $headers);

        foreach ($data as $row) {
            $csvRow = [];
            foreach ($headers as $header) {
                $value = $row[$header] ?? '';
                $csvRow[] = is_array($value) ? json_encode($value) : (string) $value;
            }
            fputcsv($output, $csvRow);
        }

        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);

        return $content;
    }

    /**
     * Get statistics about seed data.
     *
     * @return array<string, array<string, int|string>>
     */
    public function getStats(): array
    {
        $stats = [];

        foreach (self::PATHS as $type => $paths) {
            $csvPath = base_path(self::BASE_PATH.'/'.$paths['csv']);
            $csvCount = 0;

            if (file_exists($csvPath)) {
                $csvCount = count($this->readCsv($type));
            }

            $mediaCount = 0;
            if ($paths['media']) {
                $mediaDir = base_path(self::BASE_PATH.'/'.$paths['media']);
                if (is_dir($mediaDir)) {
                    $mediaCount = count(glob($mediaDir.'/*.jpg'));
                }
            }

            $stats[$type] = [
                'csv_records' => $csvCount,
                'media_files' => $mediaCount,
                'csv_path' => $paths['csv'],
                'media_path' => $paths['media'] ?? 'N/A',
            ];
        }

        return $stats;
    }

    /**
     * Check if an item has been processed.
     *
     * @param  string  $type  The data type (books, authors, etc.)
     * @param  string  $identifier  Unique identifier for the item
     */
    public function isProcessed(string $type, string $identifier): bool
    {
        $tracking = $this->loadTracking();

        return isset($tracking[$type][$identifier]);
    }

    /**
     * Mark an item as processed.
     *
     * @param  string  $type  The data type (books, authors, etc.)
     * @param  string  $identifier  Unique identifier for the item
     * @param  array<string, mixed>  $metadata  Optional metadata about the processing
     */
    public function markProcessed(string $type, string $identifier, array $metadata = []): void
    {
        $tracking = $this->loadTracking();

        if (! isset($tracking[$type])) {
            $tracking[$type] = [];
        }

        $tracking[$type][$identifier] = [
            'processed_at' => date('Y-m-d H:i:s'),
            ...$metadata,
        ];

        $this->saveTracking($tracking);
    }

    /**
     * Get count of processed items for a type.
     */
    public function getProcessedCount(string $type): int
    {
        $tracking = $this->loadTracking();

        return count($tracking[$type] ?? []);
    }

    /**
     * Clear tracking for a specific type or all types.
     */
    public function clearTracking(?string $type = null): void
    {
        if ($type === null) {
            $this->saveTracking([]);

            return;
        }

        $tracking = $this->loadTracking();
        unset($tracking[$type]);
        $this->saveTracking($tracking);
    }

    /**
     * Get tracking statistics.
     *
     * @return array<string, int>
     */
    public function getTrackingStats(): array
    {
        $tracking = $this->loadTracking();
        $stats = [];

        foreach ($tracking as $type => $items) {
            $stats[$type] = count($items);
        }

        return $stats;
    }

    /**
     * Load tracking data from file.
     *
     * Uses retry for Windows file locking issues.
     *
     * @return array<string, array<string, array<string, mixed>>>
     */
    private function loadTracking(): array
    {
        $path = base_path(self::TRACKING_FILE);

        if (! file_exists($path)) {
            return [];
        }

        $maxRetries = 3;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                $contents = file_get_contents($path);

                if ($contents === false) {
                    throw new \RuntimeException('Failed to read tracking file');
                }

                $data = json_decode($contents, true);

                return is_array($data) ? $data : [];
            } catch (\Exception $e) {
                if ($attempt === $maxRetries) {
                    Log::warning('[SeedData] Failed to load tracking, returning empty', [
                        'error' => $e->getMessage(),
                    ]);

                    return [];
                }

                usleep(100000 * $attempt);
            }
        }

        return [];
    }

    /**
     * Save tracking data to file.
     *
     * Uses atomic write with retry for Windows file locking issues.
     *
     * @param  array<string, array<string, array<string, mixed>>>  $tracking
     */
    private function saveTracking(array $tracking): void
    {
        $path = base_path(self::TRACKING_FILE);
        $directory = dirname($path);

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $tempPath = $path.'.tmp';
        $content = json_encode($tracking, JSON_PRETTY_PRINT);
        $maxRetries = 3;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                file_put_contents($tempPath, $content, LOCK_EX);

                if (file_exists($path)) {
                    @unlink($path);
                }

                if (! @rename($tempPath, $path)) {
                    @copy($tempPath, $path);
                    @unlink($tempPath);
                }

                return;
            } catch (\Exception $e) {
                if ($attempt === $maxRetries) {
                    Log::error('[SeedData] Failed to save tracking after retries', [
                        'error' => $e->getMessage(),
                    ]);

                    throw $e;
                }

                usleep(100000 * $attempt);
            }
        }
    }

    /**
     * Validate image data by checking magic bytes.
     */
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

    /**
     * Check if image data matches a known placeholder.
     *
     * Detects "image not available" placeholders by MD5 hash.
     */
    private function isPlaceholderImage(string $imageData): bool
    {
        $hash = md5($imageData);

        return in_array($hash, self::PLACEHOLDER_HASHES, true);
    }
}
