<?php

declare(strict_types=1);

namespace App\Services\SeedData;

use App\DTOs\SeedData\BookFilterResultDTO;

/**
 * Phase 1: Input Funnel - Kill list filtering for seed data.
 *
 * Filters out books that shouldn't be in the golden master library:
 * - Audiobooks and audio editions
 * - Box sets and bundles
 * - Study guides, summaries, and spam content
 * - Movie tie-in editions with promotional covers
 * - Non-English language books
 */
class BookFilterService
{
    /**
     * @var array<string>
     */
    private array $titleKeywords;

    /**
     * @var array<string>
     */
    private array $subtitleKeywords;

    /**
     * @var array<string>
     */
    private array $publisherKeywords;

    /**
     * @var array<string>
     */
    private array $allowedLanguages;

    /**
     * @var array<string>
     */
    private array $excludedFormats;

    public function __construct()
    {
        $this->titleKeywords = config('seed-data.filtering.kill_list.title_keywords', []);
        $this->subtitleKeywords = config('seed-data.filtering.kill_list.subtitle_keywords', []);
        $this->publisherKeywords = config('seed-data.filtering.kill_list.publisher_keywords', []);
        $this->allowedLanguages = config('seed-data.filtering.allowed_languages', ['en', 'eng', 'english', '']);
        $this->excludedFormats = config('seed-data.filtering.excluded_formats', []);
    }

    /**
     * Filter a book through the kill list.
     *
     * @param array<string, mixed> $book Book data with title, subtitle, publisher, language, format keys
     */
    public function filter(array $book): BookFilterResultDTO
    {
        $title = strtolower(trim($book['title'] ?? ''));
        $subtitle = strtolower(trim($book['subtitle'] ?? ''));
        $publisher = strtolower(trim($book['publisher'] ?? ''));
        $language = strtolower(trim($book['language'] ?? ''));
        $format = strtolower(trim($book['format'] ?? $book['physical_format'] ?? ''));

        if ($result = $this->checkLanguage($language)) {
            return $result;
        }

        if ($result = $this->checkFormat($format)) {
            return $result;
        }

        if ($result = $this->checkTitleKeywords($title)) {
            return $result;
        }

        if (! empty($subtitle)) {
            if ($result = $this->checkSubtitleKeywords($subtitle)) {
                return $result;
            }
        }

        if (! empty($publisher)) {
            if ($result = $this->checkPublisherKeywords($publisher)) {
                return $result;
            }
        }

        return BookFilterResultDTO::pass();
    }

    /**
     * Check if language is allowed.
     */
    private function checkLanguage(string $language): ?BookFilterResultDTO
    {
        if (empty($language)) {
            return null;
        }

        if (! in_array($language, $this->allowedLanguages, true)) {
            return BookFilterResultDTO::reject(
                reason: 'Non-English language',
                matchedKeyword: $language,
                matchedIn: 'language'
            );
        }

        return null;
    }

    /**
     * Check if format is excluded.
     */
    private function checkFormat(string $format): ?BookFilterResultDTO
    {
        if (empty($format)) {
            return null;
        }

        foreach ($this->excludedFormats as $excluded) {
            if (str_contains($format, $excluded)) {
                return BookFilterResultDTO::reject(
                    reason: 'Excluded format',
                    matchedKeyword: $excluded,
                    matchedIn: 'format'
                );
            }
        }

        return null;
    }

    /**
     * Check title against kill list keywords.
     */
    private function checkTitleKeywords(string $title): ?BookFilterResultDTO
    {
        foreach ($this->titleKeywords as $keyword) {
            if (str_contains($title, $keyword)) {
                return BookFilterResultDTO::reject(
                    reason: 'Title matches kill list',
                    matchedKeyword: $keyword,
                    matchedIn: 'title'
                );
            }
        }

        return null;
    }

    /**
     * Check subtitle against kill list keywords.
     */
    private function checkSubtitleKeywords(string $subtitle): ?BookFilterResultDTO
    {
        foreach ($this->subtitleKeywords as $keyword) {
            if (str_contains($subtitle, $keyword)) {
                return BookFilterResultDTO::reject(
                    reason: 'Subtitle matches kill list',
                    matchedKeyword: $keyword,
                    matchedIn: 'subtitle'
                );
            }
        }

        return null;
    }

    /**
     * Check publisher against kill list keywords.
     */
    private function checkPublisherKeywords(string $publisher): ?BookFilterResultDTO
    {
        foreach ($this->publisherKeywords as $keyword) {
            if (str_contains($publisher, $keyword)) {
                return BookFilterResultDTO::reject(
                    reason: 'Audio publisher',
                    matchedKeyword: $keyword,
                    matchedIn: 'publisher'
                );
            }
        }

        return null;
    }

    /**
     * Check if a book is an audiobook based on various signals.
     */
    public function isAudiobook(array $book): bool
    {
        $format = strtolower($book['format'] ?? $book['physical_format'] ?? '');
        $title = strtolower($book['title'] ?? '');
        $publisher = strtolower($book['publisher'] ?? '');

        $audioSignals = ['audio', 'audiobook', 'mp3', 'cd', 'cassette', 'narrated'];

        foreach ($audioSignals as $signal) {
            if (str_contains($format, $signal) || str_contains($title, $signal)) {
                return true;
            }
        }

        $audioPublishers = ['audible', 'recorded books', 'brilliance', 'listening library', 'books on tape'];
        foreach ($audioPublishers as $pub) {
            if (str_contains($publisher, $pub)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if this appears to be a movie tie-in edition.
     */
    public function isMovieTieIn(array $book): bool
    {
        $title = strtolower($book['title'] ?? '');
        $subtitle = strtolower($book['subtitle'] ?? '');

        $movieSignals = ['movie tie-in', 'now a major motion picture', 'netflix', 'film tie-in'];

        foreach ($movieSignals as $signal) {
            if (str_contains($title, $signal) || str_contains($subtitle, $signal)) {
                return true;
            }
        }

        return false;
    }
}
