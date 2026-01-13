<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Cleaners;

/**
 * Handles description sanitization.
 *
 * Strips HTML tags, decodes entities, and normalizes whitespace.
 */
class DescriptionCleaner
{
    /**
     * Maximum description length.
     */
    private const MAX_LENGTH = 10000;

    /**
     * Patterns indicating truncated descriptions.
     */
    private const TRUNCATION_INDICATORS = ['...', '…', '[...]', '(more)'];

    /**
     * Clean a book description.
     */
    public function clean(?string $description): ?string
    {
        if (empty($description)) {
            return null;
        }

        $description = html_entity_decode($description, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $description = preg_replace('/<br\s*\/?>/i', "\n", $description);
        $description = preg_replace('/<\/p>/i', "\n\n", $description);
        $description = preg_replace('/<\/div>/i', "\n", $description);
        $description = preg_replace('/<li>/i', "\n- ", $description);

        $description = strip_tags($description);

        $description = preg_replace('/\h+/', ' ', $description);
        $description = preg_replace('/\n{3,}/', "\n\n", $description);
        $description = preg_replace('/^\s+|\s+$/m', '', $description);

        $description = trim($description);

        if (mb_strlen($description) > self::MAX_LENGTH) {
            $description = mb_substr($description, 0, self::MAX_LENGTH).'...';
        }

        return mb_strlen($description) > 0 ? $description : null;
    }

    /**
     * Check if a description appears to be truncated.
     */
    public function isTruncated(?string $description): bool
    {
        if (empty($description)) {
            return false;
        }

        foreach (self::TRUNCATION_INDICATORS as $indicator) {
            if (str_ends_with(trim($description), $indicator)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract a short summary from a description.
     */
    public function extractSummary(?string $description, int $maxLength = 300): ?string
    {
        $cleaned = $this->clean($description);

        if ($cleaned === null) {
            return null;
        }

        if (mb_strlen($cleaned) <= $maxLength) {
            return $cleaned;
        }

        $truncated = mb_substr($cleaned, 0, $maxLength);

        $lastSpace = mb_strrpos($truncated, ' ');
        if ($lastSpace !== false && $lastSpace > $maxLength * 0.8) {
            $truncated = mb_substr($truncated, 0, $lastSpace);
        }

        return rtrim($truncated, '.,;:!?').'...';
    }
}
