<?php

declare(strict_types=1);

namespace App\Services\Metadata;

use App\Contracts\Metadata\FieldMergerInterface;
use App\DTOs\Metadata\MergedMetadataDTO;
use App\DTOs\Metadata\ScoredResultDTO;

/**
 * Merges metadata from multiple sources using configurable field priorities.
 *
 * For each field, picks the best value based on:
 * 1. Source priority for that field (configurable)
 * 2. Result overall score
 * 3. Data quality heuristics (length, completeness)
 *
 * Cover selection uses Calibre-style resolution-based algorithm
 * that picks the largest valid image by pixel surface area.
 */
class FieldMerger implements FieldMergerInterface
{
    private const MERGEABLE_FIELDS = [
        'title', 'author', 'description', 'coverUrl', 'pageCount',
        'publishedDate', 'publisher', 'isbn', 'isbn13', 'genres',
        'seriesName', 'volumeNumber', 'language', 'averageRating', 'ratingsCount',
    ];

    /** @var array<string, array<string, int>> */
    private array $fieldPriorities;

    public function __construct(
        private readonly CoverSelector $coverSelector
    ) {
        $this->fieldPriorities = config('metadata.field_priorities', []);
    }

    /**
     * @param  array<ScoredResultDTO>  $results
     */
    public function merge(array $results): MergedMetadataDTO
    {
        if (empty($results)) {
            return MergedMetadataDTO::empty();
        }

        $merged = [];
        $fieldSources = [];

        foreach (self::MERGEABLE_FIELDS as $field) {
            if ($field === 'coverUrl') {
                continue;
            }

            $best = $this->selectBestValue($field, $results);

            if ($best !== null) {
                $merged[$field] = $best['value'];
                $fieldSources[$field] = $best['source'];
            } else {
                $merged[$field] = null;
            }
        }

        $coverResult = $this->selectBestCover($results);
        $merged['coverUrl'] = $coverResult['url'];

        if ($coverResult['source']) {
            $fieldSources['coverUrl'] = $coverResult['source'];
        }

        $confidence = $this->calculateConfidence($merged, $results);

        return new MergedMetadataDTO(
            title: $merged['title'],
            author: $merged['author'],
            description: $merged['description'],
            coverUrl: $merged['coverUrl'],
            pageCount: $merged['pageCount'],
            publishedDate: $merged['publishedDate'],
            publisher: $merged['publisher'],
            isbn: $merged['isbn'],
            isbn13: $merged['isbn13'],
            genres: $merged['genres'],
            seriesName: $merged['seriesName'],
            volumeNumber: $merged['volumeNumber'],
            language: $merged['language'],
            averageRating: $merged['averageRating'],
            ratingsCount: $merged['ratingsCount'],
            fieldSources: $fieldSources,
            allResults: $results,
            confidence: $confidence,
        );
    }

    /**
     * Select the best cover using Calibre-style resolution-based algorithm.
     *
     * @param  array<ScoredResultDTO>  $results
     * @return array{url: string|null, source: string|null}
     */
    private function selectBestCover(array $results): array
    {
        $candidates = [];

        foreach ($results as $scoredResult) {
            $result = $scoredResult->result;

            if ($result->hasField('coverUrl')) {
                $candidates[$result->source] = $result->coverUrl;
            }
        }

        $selected = $this->coverSelector->selectBest($candidates);

        return [
            'url' => $selected['url'],
            'source' => $selected['source'],
        ];
    }

    public function getFieldPriority(string $field, string $source): int
    {
        return $this->fieldPriorities[$field][$source] ?? 50;
    }

    /**
     * Select the best value for a field from all results.
     *
     * @param  array<ScoredResultDTO>  $results
     * @return array{value: mixed, source: string}|null
     */
    private function selectBestValue(string $field, array $results): ?array
    {
        $candidates = [];

        foreach ($results as $scoredResult) {
            $result = $scoredResult->result;

            if (!$result->hasField($field)) {
                continue;
            }

            $value = $result->getField($field);
            $sourcePriority = $this->getFieldPriority($field, $result->source);
            $qualityScore = $this->assessFieldQuality($field, $value);

            $combinedScore = (100 - $sourcePriority) * 10
                           + $scoredResult->score
                           + $qualityScore;

            $candidates[] = [
                'value' => $value,
                'source' => $result->source,
                'score' => $combinedScore,
            ];
        }

        if (empty($candidates)) {
            return null;
        }

        usort($candidates, fn ($a, $b) => $b['score'] <=> $a['score']);

        return [
            'value' => $candidates[0]['value'],
            'source' => $candidates[0]['source'],
        ];
    }

    private function assessFieldQuality(string $field, mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0;
        }

        return match ($field) {
            'description' => min(strlen((string) $value) / 10, 100),
            'coverUrl' => str_contains((string) $value, 'http') ? 50 : 0,
            'genres' => is_array($value) ? min(count($value) * 10, 50) : 0,
            'pageCount' => ($value > 0 && $value < 5000) ? 20 : 0,
            'isbn13' => strlen((string) $value) === 13 ? 30 : 0,
            'isbn' => strlen((string) $value) >= 10 ? 20 : 0,
            default => 10,
        };
    }

    /**
     * @param  array<string, mixed>  $merged
     * @param  array<ScoredResultDTO>  $results
     */
    private function calculateConfidence(array $merged, array $results): float
    {
        $totalFields = count(self::MERGEABLE_FIELDS);
        $populatedFields = count(array_filter($merged, fn ($v) => $v !== null && $v !== ''));

        $fieldScore = ($populatedFields / $totalFields) * 50;

        $bestScore = !empty($results) ? $results[0]->score : 0;
        $matchScore = min($bestScore / 20, 50);

        return min($fieldScore + $matchScore, 100);
    }
}
