<?php

declare(strict_types=1);

namespace App\Services\SeedData;

use App\DTOs\SeedData\CoverValidationResultDTO;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Phase 4: Quality Assurance - Cover validation service.
 *
 * Validates covers meet quality thresholds:
 * - Minimum dimensions (400x600)
 * - Aspect ratio between 1.3-1.6 (height/width)
 * - Minimum file size (5KB)
 */
class CoverQualityValidator
{
    private const TIMEOUT = 10;

    private int $minWidth;

    private int $minHeight;

    private int $minFileSize;

    private int $headMinContentLength;

    private float $aspectRatioMin;

    private float $aspectRatioMax;

    public function __construct()
    {
        $this->minWidth = (int) config('seed-data.cover_quality.min_width', 400);
        $this->minHeight = (int) config('seed-data.cover_quality.min_height', 600);
        $this->minFileSize = (int) config('seed-data.cover_quality.min_file_size_bytes', 5000);
        $this->headMinContentLength = (int) config('seed-data.cover_quality.head_min_content_length', 5000);
        $this->aspectRatioMin = (float) config('seed-data.cover_quality.aspect_ratio_min', 1.3);
        $this->aspectRatioMax = (float) config('seed-data.cover_quality.aspect_ratio_max', 1.6);
    }

    /**
     * Pre-validate a cover URL with a HEAD request.
     *
     * Checks Content-Length without downloading the full image.
     */
    public function preValidate(string $url): CoverValidationResultDTO
    {
        try {
            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->head($url);

            if (! $response->successful()) {
                return CoverValidationResultDTO::fail(
                    "HTTP {$response->status()}",
                    $url
                );
            }

            $contentLength = (int) $response->header('Content-Length', '0');

            if ($contentLength > 0 && $contentLength < $this->headMinContentLength) {
                return CoverValidationResultDTO::fail(
                    "Content-Length too small: {$contentLength} bytes",
                    $url
                );
            }

            return CoverValidationResultDTO::preValidationPass($contentLength, $url);
        } catch (\Exception $e) {
            Log::debug('[CoverQualityValidator] HEAD request failed', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return CoverValidationResultDTO::fail($e->getMessage(), $url);
        }
    }

    /**
     * Fully validate a cover by downloading and checking dimensions.
     */
    public function validate(string $url): CoverValidationResultDTO
    {
        try {
            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get($url);

            if (! $response->successful()) {
                return CoverValidationResultDTO::fail(
                    "HTTP {$response->status()}",
                    $url
                );
            }

            $imageData = $response->body();
            $fileSize = strlen($imageData);

            if ($fileSize < $this->minFileSize) {
                return CoverValidationResultDTO::fail(
                    "File too small: {$fileSize} bytes (min: {$this->minFileSize})",
                    $url
                );
            }

            $dimensions = $this->getImageDimensions($imageData);

            if (! $dimensions) {
                return CoverValidationResultDTO::fail(
                    'Could not parse image dimensions',
                    $url
                );
            }

            [$width, $height] = $dimensions;

            if ($width < $this->minWidth) {
                return CoverValidationResultDTO::failWithDimensions(
                    "Width too small: {$width}px (min: {$this->minWidth})",
                    $width,
                    $height,
                    $fileSize,
                    $url
                );
            }

            if ($height < $this->minHeight) {
                return CoverValidationResultDTO::failWithDimensions(
                    "Height too small: {$height}px (min: {$this->minHeight})",
                    $width,
                    $height,
                    $fileSize,
                    $url
                );
            }

            $aspectRatio = $height / $width;

            if ($aspectRatio < $this->aspectRatioMin || $aspectRatio > $this->aspectRatioMax) {
                return CoverValidationResultDTO::failWithDimensions(
                    sprintf(
                        'Aspect ratio out of range: %.2f (expected %.1f-%.1f)',
                        $aspectRatio,
                        $this->aspectRatioMin,
                        $this->aspectRatioMax
                    ),
                    $width,
                    $height,
                    $fileSize,
                    $url
                );
            }

            return CoverValidationResultDTO::pass($width, $height, $fileSize, $url);
        } catch (\Exception $e) {
            Log::debug('[CoverQualityValidator] Validation failed', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return CoverValidationResultDTO::fail($e->getMessage(), $url);
        }
    }

    /**
     * Validate cover data that's already been downloaded.
     */
    public function validateImageData(string $imageData, string $sourceUrl): CoverValidationResultDTO
    {
        $fileSize = strlen($imageData);

        if ($fileSize < $this->minFileSize) {
            return CoverValidationResultDTO::fail(
                "File too small: {$fileSize} bytes (min: {$this->minFileSize})",
                $sourceUrl
            );
        }

        $dimensions = $this->getImageDimensions($imageData);

        if (! $dimensions) {
            return CoverValidationResultDTO::fail(
                'Could not parse image dimensions',
                $sourceUrl
            );
        }

        [$width, $height] = $dimensions;

        if ($width < $this->minWidth) {
            return CoverValidationResultDTO::failWithDimensions(
                "Width too small: {$width}px (min: {$this->minWidth})",
                $width,
                $height,
                $fileSize,
                $sourceUrl
            );
        }

        if ($height < $this->minHeight) {
            return CoverValidationResultDTO::failWithDimensions(
                "Height too small: {$height}px (min: {$this->minHeight})",
                $width,
                $height,
                $fileSize,
                $sourceUrl
            );
        }

        $aspectRatio = $height / $width;

        if ($aspectRatio < $this->aspectRatioMin || $aspectRatio > $this->aspectRatioMax) {
            return CoverValidationResultDTO::failWithDimensions(
                sprintf(
                    'Aspect ratio out of range: %.2f (expected %.1f-%.1f)',
                    $aspectRatio,
                    $this->aspectRatioMin,
                    $this->aspectRatioMax
                ),
                $width,
                $height,
                $fileSize,
                $sourceUrl
            );
        }

        return CoverValidationResultDTO::pass($width, $height, $fileSize, $sourceUrl);
    }

    /**
     * Get image dimensions from raw bytes.
     *
     * @return array{0: int, 1: int}|null [width, height]
     */
    private function getImageDimensions(string $data): ?array
    {
        if (strlen($data) < 24) {
            return null;
        }

        if (substr($data, 0, 8) === "\x89PNG\r\n\x1a\n") {
            $width = unpack('N', substr($data, 16, 4))[1];
            $height = unpack('N', substr($data, 20, 4))[1];

            return [$width, $height];
        }

        if (substr($data, 0, 2) === "\xff\xd8") {
            return $this->parseJpegDimensions($data);
        }

        if (substr($data, 0, 6) === 'GIF87a' || substr($data, 0, 6) === 'GIF89a') {
            $width = unpack('v', substr($data, 6, 2))[1];
            $height = unpack('v', substr($data, 8, 2))[1];

            return [$width, $height];
        }

        if (substr($data, 0, 4) === 'RIFF' && substr($data, 8, 4) === 'WEBP') {
            return $this->parseWebpDimensions($data);
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'cover_');
        file_put_contents($tempFile, $data);
        $size = @getimagesize($tempFile);
        unlink($tempFile);

        if ($size) {
            return [$size[0], $size[1]];
        }

        return null;
    }

    /**
     * Parse JPEG dimensions from SOF marker.
     *
     * @return array{0: int, 1: int}|null
     */
    private function parseJpegDimensions(string $data): ?array
    {
        $len = strlen($data);
        $i = 2;

        while ($i < $len - 9) {
            if (ord($data[$i]) !== 0xFF) {
                $i++;

                continue;
            }

            $marker = ord($data[$i + 1]);

            if ($marker >= 0xC0 && $marker <= 0xCF && $marker !== 0xC4 && $marker !== 0xC8 && $marker !== 0xCC) {
                $height = unpack('n', substr($data, $i + 5, 2))[1];
                $width = unpack('n', substr($data, $i + 7, 2))[1];

                return [$width, $height];
            }

            $segmentLength = unpack('n', substr($data, $i + 2, 2))[1];
            $i += 2 + $segmentLength;
        }

        return null;
    }

    /**
     * Parse WebP dimensions.
     *
     * @return array{0: int, 1: int}|null
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
            $width = unpack('v', substr($data, 26, 2))[1] & 0x3FFF;
            $height = unpack('v', substr($data, 28, 2))[1] & 0x3FFF;

            return [$width, $height];
        }

        if ($chunk === 'VP8L') {
            $bits = unpack('V', substr($data, 21, 4))[1];
            $width = ($bits & 0x3FFF) + 1;
            $height = (($bits >> 14) & 0x3FFF) + 1;

            return [$width, $height];
        }

        return null;
    }
}
