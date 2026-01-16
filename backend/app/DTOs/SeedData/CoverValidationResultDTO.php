<?php

declare(strict_types=1);

namespace App\DTOs\SeedData;

/**
 * Result of cover quality validation.
 *
 * Contains dimensions, aspect ratio, file size, and validation status.
 */
final readonly class CoverValidationResultDTO
{
    public function __construct(
        public bool $isValid,
        public ?int $width = null,
        public ?int $height = null,
        public ?float $aspectRatio = null,
        public ?int $fileSize = null,
        public ?string $failureReason = null,
        public ?string $sourceUrl = null,
    ) {}

    public static function pass(
        int $width,
        int $height,
        int $fileSize,
        string $sourceUrl
    ): self {
        return new self(
            isValid: true,
            width: $width,
            height: $height,
            aspectRatio: $width > 0 ? $height / $width : null,
            fileSize: $fileSize,
            sourceUrl: $sourceUrl,
        );
    }

    public static function preValidationPass(int $contentLength, string $sourceUrl): self
    {
        return new self(
            isValid: true,
            fileSize: $contentLength,
            sourceUrl: $sourceUrl,
        );
    }

    public static function fail(string $reason, ?string $sourceUrl = null): self
    {
        return new self(
            isValid: false,
            failureReason: $reason,
            sourceUrl: $sourceUrl,
        );
    }

    public static function failWithDimensions(
        string $reason,
        int $width,
        int $height,
        int $fileSize,
        string $sourceUrl
    ): self {
        return new self(
            isValid: false,
            width: $width,
            height: $height,
            aspectRatio: $width > 0 ? $height / $width : null,
            fileSize: $fileSize,
            failureReason: $reason,
            sourceUrl: $sourceUrl,
        );
    }

    public function getDebugMessage(): string
    {
        if ($this->isValid) {
            return sprintf(
                'Cover accepted: %dx%d (ratio: %.2f, %dKB)',
                $this->width,
                $this->height,
                $this->aspectRatio,
                $this->fileSize ? (int) ($this->fileSize / 1024) : 0
            );
        }

        $message = "Cover rejected: {$this->failureReason}";

        if ($this->width && $this->height) {
            $message .= sprintf(
                ' (%dx%d, ratio: %.2f)',
                $this->width,
                $this->height,
                $this->aspectRatio ?? 0
            );
        }

        return $message;
    }
}
