<?php

declare(strict_types=1);

namespace App\DTOs\Metadata;

/**
 * A metadata result with computed relevance score.
 */
final readonly class ScoredResultDTO
{
    /**
     * @param  array<string, float>  $scoreBreakdown  Breakdown of score components
     */
    public function __construct(
        public MetadataResultDTO $result,
        public float $score,
        public array $scoreBreakdown = [],
    ) {}
}
