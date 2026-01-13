<?php

declare(strict_types=1);

namespace App\Services\Ingestion;

use App\Contracts\DataSanitizerInterface;
use App\DTOs\Ingestion\CleanBookDTO;
use App\DTOs\Ingestion\RawBookDTO;
use App\DTOs\Ingestion\SanitizationResultDTO;
use App\Services\Ingestion\Cleaners\AuthorCleaner;
use App\Services\Ingestion\Cleaners\DescriptionCleaner;
use App\Services\Ingestion\Cleaners\GenreCleaner;
use App\Services\Ingestion\Cleaners\IsbnCleaner;
use App\Services\Ingestion\Cleaners\TitleCleaner;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Level 1 (Code/Bouncer) data sanitization.
 *
 * Coordinates all cleaners to transform raw book data into
 * a sanitized CleanBookDTO. Handles ~95% of cases without LLM.
 */
class DataSanitizer implements DataSanitizerInterface
{
    public function __construct(
        private readonly TitleCleaner $titleCleaner,
        private readonly AuthorCleaner $authorCleaner,
        private readonly DescriptionCleaner $descriptionCleaner,
        private readonly GenreCleaner $genreCleaner,
        private readonly IsbnCleaner $isbnCleaner,
    ) {}

    /**
     * {@inheritdoc}
     */
    public function sanitize(RawBookDTO $raw, string $source = 'unknown'): SanitizationResultDTO
    {
        Log::info('[DataSanitizer] Starting sanitization', [
            'title' => $raw->title,
            'rawGenres' => $raw->genres,
            'source' => $source,
        ]);

        $warnings = [];
        $llmDecisions = [];

        $titleResult = $this->titleCleaner->extractSeries($raw->title ?? '');
        $title = $titleResult['title'];
        $seriesName = $titleResult['series_name'] ?? $raw->seriesName;
        $volumeNumber = $titleResult['volume_number'] ?? $raw->volumeNumber;

        $authors = $this->authorCleaner->clean($raw->author);

        $description = $this->descriptionCleaner->clean($raw->description);
        if ($this->descriptionCleaner->isTruncated($raw->description)) {
            $warnings[] = 'Description appears to be truncated';
        }

        $genreResult = $this->genreCleaner->clean($raw->genres, $source);
        $rawGenres = $genreResult['normalized'];
        $originalGenres = $raw->genres ?? [];

        $needsGenreEnrichment = $genreResult['needsLlmEnrichment'] ?? false;

        if ($needsGenreEnrichment && ! empty($originalGenres)) {
            $rawGenres = $originalGenres;
        }

        Log::info('[DataSanitizer] Genre cleaning result', [
            'inputGenres' => $raw->genres,
            'cleanedGenres' => $rawGenres,
            'mappings' => $genreResult['mappings'],
            'needsGenreEnrichment' => $needsGenreEnrichment,
        ]);

        foreach ($genreResult['mappings'] as $normalized => $mapping) {
            if ($mapping === null) {
                $llmDecisions[] = [
                    'type' => 'genre',
                    'data' => ['genre' => $normalized, 'source' => $source],
                ];
            }
        }

        $isbnResult = $this->isbnCleaner->clean($raw->isbn, $raw->isbn13);
        if (! $isbnResult['valid'] && ($raw->isbn || $raw->isbn13)) {
            $warnings[] = 'Invalid ISBN provided';
        }

        $publishedDate = $this->parseDate($raw->publishedDate);

        $clean = new CleanBookDTO(
            title: $title,
            authors: $authors,
            description: $description,
            rawGenres: $rawGenres,
            isbn: $isbnResult['isbn10'],
            isbn13: $isbnResult['isbn13'],
            pageCount: $raw->pageCount,
            publishedDate: $publishedDate,
            publisherName: $raw->publisher,
            coverUrl: $this->sanitizeCoverUrl($raw->coverUrl),
            externalId: $raw->externalId,
            externalProvider: $raw->externalProvider ?? $source,
            seriesId: null,
            seriesName: $seriesName,
            volumeNumber: $volumeNumber,
            heightCm: $raw->heightCm,
            widthCm: $raw->widthCm,
            thicknessCm: $raw->thicknessCm,
            language: $raw->language,
        );

        return new SanitizationResultDTO(
            book: $clean,
            warnings: $warnings,
            llmDecisions: $llmDecisions,
            needsReview: ! empty($llmDecisions),
            needsGenreEnrichment: $needsGenreEnrichment,
        );
    }

    /**
     * {@inheritdoc}
     */
    public function sanitizeTitle(?string $title): string
    {
        return $this->titleCleaner->clean($title);
    }

    /**
     * {@inheritdoc}
     */
    public function sanitizeDescription(?string $description): ?string
    {
        return $this->descriptionCleaner->clean($description);
    }

    /**
     * Parse various date formats into Carbon.
     */
    private function parseDate(?string $date): ?Carbon
    {
        if (empty($date)) {
            return null;
        }

        if (preg_match('/^\d{4}$/', $date)) {
            return Carbon::createFromFormat('Y', $date)->startOfYear();
        }

        if (preg_match('/^\d{4}-\d{2}$/', $date)) {
            return Carbon::createFromFormat('Y-m', $date)->startOfMonth();
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return Carbon::createFromFormat('Y-m-d', $date);
        }

        if (preg_match('/^\d{4}\/\d{2}\/\d{2}$/', $date)) {
            return Carbon::createFromFormat('Y/m/d', $date);
        }

        try {
            return Carbon::parse($date);
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Sanitize cover URL.
     */
    private function sanitizeCoverUrl(?string $url): ?string
    {
        if (empty($url)) {
            return null;
        }

        $url = trim($url);

        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        $url = preg_replace('/&edge=curl/', '', $url);
        $url = preg_replace('/&zoom=\d+/', '&zoom=1', $url);

        return $url;
    }
}
