<?php

declare(strict_types=1);

namespace App\Contracts\Metadata;

use App\DTOs\Metadata\MergedMetadataDTO;
use App\DTOs\Metadata\ScoredResultDTO;

/**
 * Contract for field-level metadata merging.
 *
 * Cherry-picks the best value for each field from multiple sources
 * based on configurable priority rules and data quality heuristics.
 */
interface FieldMergerInterface
{
    /**
     * Merge multiple scored results into a single output.
     *
     * @param  array<ScoredResultDTO>  $results  Scored results, highest first
     * @return MergedMetadataDTO The merged output with provenance tracking
     */
    public function merge(array $results): MergedMetadataDTO;

    /**
     * Get the configured priority for a field from a source.
     *
     * @param  string  $field  Field name (e.g., 'description', 'coverUrl')
     * @param  string  $source  Source name (e.g., 'open_library')
     * @return int Priority (1-100, lower = higher priority)
     */
    public function getFieldPriority(string $field, string $source): int;
}
