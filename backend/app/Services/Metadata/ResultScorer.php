<?php

declare(strict_types=1);

namespace App\Services\Metadata;

use App\DTOs\Metadata\MetadataQueryDTO;
use App\DTOs\Metadata\MetadataResultDTO;
use App\DTOs\Metadata\ScoredResultDTO;

/**
 * Scores metadata results for relevance.
 *
 * Scoring algorithm inspired by Calibre:
 * - Identifier match (ISBN): +1000 (deterministic, highly trusted)
 * - Title similarity: +0-100 (percentage-based)
 * - Author match: +50
 * - Has cover: +25
 * - Has description: +15
 * - Completeness: +5 per field
 */
class ResultScorer
{
    private const SCORE_IDENTIFIER_MATCH = 1000;
    private const SCORE_EXACT_TITLE = 100;
    private const SCORE_AUTHOR_MATCH = 50;
    private const SCORE_HAS_COVER = 25;
    private const SCORE_HAS_DESCRIPTION = 15;
    private const SCORE_PER_FIELD = 5;
    private const MAX_COMPLETENESS_SCORE = 50;

    public function score(MetadataResultDTO $result, MetadataQueryDTO $query): ScoredResultDTO
    {
        $score = 0.0;
        $breakdown = [];

        if ($result->isIdentifierMatch) {
            $score += self::SCORE_IDENTIFIER_MATCH;
            $breakdown['identifier_match'] = self::SCORE_IDENTIFIER_MATCH;
        }

        if ($query->title && $result->title) {
            $titleScore = $this->calculateTitleScore($query->title, $result->title);
            $score += $titleScore;
            $breakdown['title_similarity'] = $titleScore;
        }

        if ($query->author && $result->author) {
            $authorScore = $this->calculateAuthorScore($query->author, $result->author);
            $score += $authorScore;
            $breakdown['author_match'] = $authorScore;
        }

        if ($result->hasField('coverUrl')) {
            $score += self::SCORE_HAS_COVER;
            $breakdown['has_cover'] = self::SCORE_HAS_COVER;
        }

        if ($result->hasField('description') && strlen((string) $result->description) > 50) {
            $score += self::SCORE_HAS_DESCRIPTION;
            $breakdown['has_description'] = self::SCORE_HAS_DESCRIPTION;
        }

        $completeness = count($result->getPopulatedFields());
        $completenessScore = min($completeness * self::SCORE_PER_FIELD, self::MAX_COMPLETENESS_SCORE);
        $score += $completenessScore;
        $breakdown['completeness'] = $completenessScore;

        return new ScoredResultDTO(
            result: $result,
            score: $score,
            scoreBreakdown: $breakdown
        );
    }

    private function calculateTitleScore(string $queryTitle, string $resultTitle): float
    {
        $queryNorm = $this->normalizeTitle($queryTitle);
        $resultNorm = $this->normalizeTitle($resultTitle);

        if ($queryNorm === $resultNorm) {
            return self::SCORE_EXACT_TITLE;
        }

        if (str_contains($resultNorm, $queryNorm) || str_contains($queryNorm, $resultNorm)) {
            return self::SCORE_EXACT_TITLE * 0.85;
        }

        similar_text($queryNorm, $resultNorm, $percent);

        return ($percent / 100) * self::SCORE_EXACT_TITLE;
    }

    private function calculateAuthorScore(string $queryAuthor, string $resultAuthor): float
    {
        $queryNorm = $this->normalizeAuthor($queryAuthor);
        $resultNorm = $this->normalizeAuthor($resultAuthor);

        $queryPrimary = explode(',', $queryNorm)[0];
        $resultPrimary = explode(',', $resultNorm)[0];

        if (str_contains($resultPrimary, $queryPrimary) || str_contains($queryPrimary, $resultPrimary)) {
            return self::SCORE_AUTHOR_MATCH;
        }

        similar_text($queryPrimary, $resultPrimary, $percent);

        return ($percent / 100) * self::SCORE_AUTHOR_MATCH;
    }

    private function normalizeTitle(string $title): string
    {
        $title = strtolower(trim($title));
        $title = preg_replace('/[^a-z0-9\s]/', '', $title);

        return preg_replace('/\s+/', ' ', $title);
    }

    private function normalizeAuthor(string $author): string
    {
        $author = strtolower(trim($author));
        $author = preg_replace('/\s*\([^)]*\)/', '', $author);

        return preg_replace('/\s+/', ' ', $author);
    }
}
