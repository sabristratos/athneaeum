<?php

declare(strict_types=1);

namespace App\Services\Metadata;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Calibre-style cover selection using resolution and quality-based algorithm.
 *
 * Selects the best cover from multiple sources based on:
 * 1. Source priority (Google Books preferred for publisher covers)
 * 2. File size (reject tiny/compressed images)
 * 3. Pixel surface area (width × height)
 * 4. Aspect ratio filtering (book-like ratios preferred)
 */
class CoverSelector
{
    private const MIN_WIDTH = 200;

    private const MIN_HEIGHT = 300;

    private const MIN_FILE_SIZE = 30000;

    private const PREFERRED_FILE_SIZE = 50000;

    private const MIN_ASPECT_RATIO = 0.55;

    private const MAX_ASPECT_RATIO = 0.85;

    private const IDEAL_ASPECT_RATIO = 0.667;

    private const REQUEST_TIMEOUT = 10;

    // Open Library curated covers tend to be higher quality publisher covers
    // Google Books thumbnails are often compressed and lower resolution
    private const SOURCE_PRIORITY = [
        'open_library' => 100,
        'google_books' => 50,
    ];

    /**
     * Select the best cover from multiple candidates.
     *
     * Simple strategy: prefer Open Library's curated cover (from search results)
     * as it's typically a high-quality publisher cover shown in their UI.
     *
     * @param  array<string, string|null>  $candidates  Map of source => coverUrl
     * @return array{url: string|null, source: string|null, dimensions: array{width: int, height: int}|null}
     */
    public function selectBest(array $candidates): array
    {
        $candidates = array_filter($candidates);

        if (empty($candidates)) {
            return ['url' => null, 'source' => null, 'dimensions' => null];
        }

        // Simple: prefer Open Library if available (curated covers from search UI)
        if (isset($candidates['open_library'])) {
            Log::debug('[CoverSelector] Using Open Library cover (preferred source)', [
                'url' => $candidates['open_library'],
            ]);

            return [
                'url' => $candidates['open_library'],
                'source' => 'open_library',
                'dimensions' => null,
            ];
        }

        // Fallback to first available source
        $firstSource = array_key_first($candidates);

        Log::debug('[CoverSelector] Using fallback cover', [
            'source' => $firstSource,
            'url' => $candidates[$firstSource],
        ]);

        return [
            'url' => $candidates[$firstSource],
            'source' => $firstSource,
            'dimensions' => null,
        ];
    }

    /**
     * Analyze all cover candidates in parallel.
     *
     * @param  array<string, string>  $candidates
     * @return array<int, array{source: string, url: string, width: int, height: int, surface_area: int, aspect_ratio: float, file_size: int, score: float}>
     */
    private function analyzeCovers(array $candidates): array
    {
        $results = [];

        foreach ($candidates as $source => $url) {
            $imageInfo = $this->getImageInfo($url);

            if (!$imageInfo) {
                Log::debug("[CoverSelector] Could not get info for {$source}", ['url' => $url]);

                continue;
            }

            $width = $imageInfo['width'];
            $height = $imageInfo['height'];
            $fileSize = $imageInfo['file_size'];

            if ($width < self::MIN_WIDTH || $height < self::MIN_HEIGHT) {
                Log::debug("[CoverSelector] {$source} cover too small: {$width}x{$height}");

                continue;
            }

            if ($fileSize < self::MIN_FILE_SIZE) {
                Log::debug("[CoverSelector] {$source} cover file too small: {$fileSize} bytes (likely compressed/low quality)");

                continue;
            }

            $aspectRatio = $width / $height;
            $surfaceArea = $width * $height;

            $score = $this->calculateScore($source, $width, $height, $aspectRatio, $surfaceArea, $fileSize);

            $results[] = [
                'source' => $source,
                'url' => $url,
                'width' => $width,
                'height' => $height,
                'surface_area' => $surfaceArea,
                'aspect_ratio' => $aspectRatio,
                'file_size' => $fileSize,
                'score' => $score,
            ];
        }

        return $results;
    }

    /**
     * Calculate cover quality score.
     *
     * Factors (in order of importance):
     * 1. Source priority (Google Books preferred for publisher covers)
     * 2. File size (larger = likely higher quality)
     * 3. Surface area (resolution)
     * 4. Aspect ratio closeness to ideal book ratio
     */
    private function calculateScore(
        string $source,
        int $width,
        int $height,
        float $aspectRatio,
        int $surfaceArea,
        int $fileSize
    ): float {
        $score = 0.0;

        // Source priority is a tiebreaker, not the main factor
        // Resolution and file size should be primary determinants
        $sourcePriority = self::SOURCE_PRIORITY[$source] ?? 0;
        $score += $sourcePriority * 10;

        if ($fileSize >= self::PREFERRED_FILE_SIZE) {
            $score += 500;
        } elseif ($fileSize >= self::MIN_FILE_SIZE) {
            $score += 200;
        }

        $score += $surfaceArea / 100;

        if ($aspectRatio >= self::MIN_ASPECT_RATIO && $aspectRatio <= self::MAX_ASPECT_RATIO) {
            $aspectDeviation = abs($aspectRatio - self::IDEAL_ASPECT_RATIO);
            $aspectBonus = 100 * (1.0 - $aspectDeviation / 0.2);
            $score += max($aspectBonus, 0);
        }

        if ($height >= 800) {
            $score += 200;
        }

        return $score;
    }

    /**
     * Get image info (dimensions and file size).
     *
     * Downloads the full image to get accurate file size for quality assessment.
     *
     * @return array{width: int, height: int, file_size: int}|null
     */
    private function getImageInfo(string $url): ?array
    {
        try {
            $response = Http::timeout(self::REQUEST_TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get($url);

            if (!$response->successful()) {
                return null;
            }

            $imageData = $response->body();
            $fileSize = strlen($imageData);

            if (empty($imageData) || $fileSize < 1000) {
                return null;
            }

            $dimensions = $this->parseDimensionsFromBytes($imageData);

            if ($dimensions) {
                return [
                    'width' => $dimensions['width'],
                    'height' => $dimensions['height'],
                    'file_size' => $fileSize,
                ];
            }

            $tempFile = tempnam(sys_get_temp_dir(), 'cover_');
            file_put_contents($tempFile, $imageData);
            $size = @getimagesize($tempFile);
            unlink($tempFile);

            if ($size) {
                return [
                    'width' => $size[0],
                    'height' => $size[1],
                    'file_size' => $fileSize,
                ];
            }

            return null;
        } catch (\Exception $e) {
            Log::debug('[CoverSelector] Failed to get image info', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Parse image dimensions from raw bytes.
     *
     * Supports JPEG, PNG, GIF, and WebP formats.
     *
     * @return array{width: int, height: int}|null
     */
    private function parseDimensionsFromBytes(string $data): ?array
    {
        if (strlen($data) < 24) {
            return null;
        }

        if (substr($data, 0, 8) === "\x89PNG\r\n\x1a\n") {
            $width = unpack('N', substr($data, 16, 4))[1];
            $height = unpack('N', substr($data, 20, 4))[1];

            return ['width' => $width, 'height' => $height];
        }

        if (substr($data, 0, 2) === "\xff\xd8") {
            return $this->parseJpegDimensions($data);
        }

        if (substr($data, 0, 6) === 'GIF87a' || substr($data, 0, 6) === 'GIF89a') {
            $width = unpack('v', substr($data, 6, 2))[1];
            $height = unpack('v', substr($data, 8, 2))[1];

            return ['width' => $width, 'height' => $height];
        }

        if (substr($data, 0, 4) === 'RIFF' && substr($data, 8, 4) === 'WEBP') {
            return $this->parseWebpDimensions($data);
        }

        return null;
    }

    /**
     * Parse JPEG dimensions from SOF marker.
     *
     * @return array{width: int, height: int}|null
     */
    private function parseJpegDimensions(string $data): ?array
    {
        $len = strlen($data);
        $i = 2;

        while ($i < $len - 9) {
            if (ord($data[$i]) !== 0xff) {
                $i++;

                continue;
            }

            $marker = ord($data[$i + 1]);

            if ($marker >= 0xc0 && $marker <= 0xcf && $marker !== 0xc4 && $marker !== 0xc8 && $marker !== 0xcc) {
                $height = unpack('n', substr($data, $i + 5, 2))[1];
                $width = unpack('n', substr($data, $i + 7, 2))[1];

                return ['width' => $width, 'height' => $height];
            }

            $segmentLength = unpack('n', substr($data, $i + 2, 2))[1];
            $i += 2 + $segmentLength;
        }

        return null;
    }

    /**
     * Parse WebP dimensions.
     *
     * @return array{width: int, height: int}|null
     */
    private function parseWebpDimensions(string $data): ?array
    {
        if (strlen($data) < 30) {
            return null;
        }

        $chunk = substr($data, 12, 4);

        if ($chunk === 'VP8 ') {
            if (substr($data, 23, 3) !== "\x9d\x01\x2a") {
                return null;
            }
            $width = unpack('v', substr($data, 26, 2))[1] & 0x3fff;
            $height = unpack('v', substr($data, 28, 2))[1] & 0x3fff;

            return ['width' => $width, 'height' => $height];
        }

        if ($chunk === 'VP8L') {
            $bits = unpack('V', substr($data, 21, 4))[1];
            $width = ($bits & 0x3fff) + 1;
            $height = (($bits >> 14) & 0x3fff) + 1;

            return ['width' => $width, 'height' => $height];
        }

        return null;
    }

    /**
     * Apply high-resolution hack to Google Books cover URL.
     *
     * Google Books URLs use `&zoom=1` for thumbnails. Removing this
     * and adding `&fife=w1000` requests a higher resolution version.
     */
    public static function applyHighResHack(string $url): string
    {
        if (! str_contains($url, 'books.google.com') && ! str_contains($url, 'googleapis.com')) {
            return $url;
        }

        $url = preg_replace('/[&?]zoom=\d/', '', $url);

        $fifeParam = config('seed-data.cover_sources.google_books_high_res.fife_param', 'w1000');

        if (str_contains($url, '?')) {
            $url .= "&fife={$fifeParam}";
        } else {
            $url .= "?fife={$fifeParam}";
        }

        return $url;
    }
}
