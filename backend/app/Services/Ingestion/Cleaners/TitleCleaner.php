<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Cleaners;

use Illuminate\Support\Facades\Log;

/**
 * Handles title sanitization and series extraction.
 */
class TitleCleaner
{
    /**
     * Patterns that indicate series information in a title.
     * Capture groups: 1 = title, 2 = series name (when applicable), 3 = volume number
     */
    private const SERIES_PATTERNS = [
        '/^(.+?)\s*\(([^,)]+),\s*#(\d+(?:\.\d+)?)\)$/u',
        '/^(.+?)\s*\(([^,)]+),\s*(?:Book|Vol\.?|Volume|Part)\s*(\d+)\)$/iu',
        '/^(.+?)\s*\[([^\],]+),\s*#(\d+(?:\.\d+)?)\]$/u',
        '/^(.+?)\s*:\s*([^:]+)\s+Book\s+(\d+)$/iu',
        '/^(.+?)\s+\(Book\s+(\d+)\)$/iu',
        '/^(.+?),?\s+Book\s+(\d+)$/iu',
        '/^(.+?)\s+#(\d+)$/u',
    ];

    /**
     * Subtitles/series markers to strip from clean titles.
     */
    private const SUBTITLE_SEPARATORS = [': A Novel', ': A Memoir', ' - A Novel'];

    /**
     * Clean a book title.
     */
    public function clean(?string $title): string
    {
        if (empty($title)) {
            return 'Untitled';
        }

        $title = trim($title);
        $title = html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $title = preg_replace('/\s+/', ' ', $title);

        foreach (self::SUBTITLE_SEPARATORS as $separator) {
            if (str_ends_with($title, $separator)) {
                $title = substr($title, 0, -strlen($separator));
            }
        }

        return trim($title);
    }

    /**
     * Extract series information from a title.
     *
     * @return array{title: string, series_name: ?string, volume_number: ?int}
     */
    public function extractSeries(string $title): array
    {
        $cleanTitle = $this->clean($title);

        foreach (self::SERIES_PATTERNS as $pattern) {
            if (preg_match($pattern, $cleanTitle, $matches)) {
                $result = [
                    'title' => trim($matches[1]),
                    'series_name' => isset($matches[2]) && ! is_numeric($matches[2]) ? trim($matches[2]) : null,
                    'volume_number' => isset($matches[3]) ? (int) $matches[3] : (isset($matches[2]) && is_numeric($matches[2]) ? (int) $matches[2] : null),
                ];

                Log::info('[TitleCleaner] Series extracted from title', [
                    'originalTitle' => $title,
                    'extractedTitle' => $result['title'],
                    'seriesName' => $result['series_name'],
                    'volumeNumber' => $result['volume_number'],
                    'patternUsed' => $pattern,
                ]);

                return $result;
            }
        }

        return [
            'title' => $cleanTitle,
            'series_name' => null,
            'volume_number' => null,
        ];
    }

    /**
     * Check if a title contains series information.
     */
    public function hasSeries(string $title): bool
    {
        foreach (self::SERIES_PATTERNS as $pattern) {
            if (preg_match($pattern, $title)) {
                return true;
            }
        }

        return false;
    }
}
