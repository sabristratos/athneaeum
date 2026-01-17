<?php

declare(strict_types=1);

namespace App\Contracts\Metadata;

use App\DTOs\Metadata\MergedMetadataDTO;
use App\DTOs\Metadata\MetadataQueryDTO;

/**
 * Contract for the metadata aggregation orchestrator.
 *
 * Implements scatter-gather pattern: queries all sources in parallel,
 * scores results, and merges the best fields from each source.
 */
interface MetadataAggregatorInterface
{
    /**
     * Aggregate metadata from all available sources.
     *
     * @param  MetadataQueryDTO  $query  The search query
     * @param  array<string>|null  $sources  Limit to specific sources (null = all)
     * @return MergedMetadataDTO The merged result with field provenance
     */
    public function aggregate(
        MetadataQueryDTO $query,
        ?array $sources = null
    ): MergedMetadataDTO;

    /**
     * Register a metadata source.
     */
    public function registerSource(MetadataSourceInterface $source): void;

    /**
     * Get all registered sources.
     *
     * @return array<MetadataSourceInterface>
     */
    public function getSources(): array;
}
