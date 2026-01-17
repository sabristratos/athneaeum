<?php

declare(strict_types=1);

namespace App\Services\Metadata;

use App\Contracts\Metadata\FieldMergerInterface;
use App\Contracts\Metadata\MetadataAggregatorInterface;
use App\Contracts\Metadata\MetadataSourceInterface;
use App\DTOs\Metadata\MergedMetadataDTO;
use App\DTOs\Metadata\MetadataQueryDTO;
use App\DTOs\Metadata\MetadataResultDTO;
use App\DTOs\Metadata\ScoredResultDTO;
use App\Services\Metadata\Concerns\HasParallelQueries;
use Illuminate\Support\Facades\Log;

/**
 * Scatter-gather metadata aggregation orchestrator.
 *
 * Queries all registered sources in parallel, scores results for relevance,
 * and uses the FieldMerger to cherry-pick the best data from each source.
 */
class MetadataAggregator implements MetadataAggregatorInterface
{
    use HasParallelQueries;

    /** @var array<string, MetadataSourceInterface> */
    private array $sources = [];

    public function __construct(
        private readonly ResultScorer $scorer,
        private readonly FieldMergerInterface $merger
    ) {}

    public function registerSource(MetadataSourceInterface $source): void
    {
        $this->sources[$source->getSourceName()] = $source;
    }

    /**
     * @return array<MetadataSourceInterface>
     */
    public function getSources(): array
    {
        return array_values($this->sources);
    }

    public function aggregate(
        MetadataQueryDTO $query,
        ?array $sources = null
    ): MergedMetadataDTO {
        $activeSources = $this->getActiveSources($sources);

        if (empty($activeSources)) {
            Log::warning('[MetadataAggregator] No available sources');

            return MergedMetadataDTO::empty();
        }

        $results = $this->scatterQuery($query, $activeSources);

        if (empty($results)) {
            Log::debug('[MetadataAggregator] No results from any source', [
                'query' => $query->title ?? $query->getPrimaryIsbn(),
            ]);

            return MergedMetadataDTO::empty();
        }

        $scored = $this->scoreResults($results, $query);

        usort($scored, fn ($a, $b) => $b->score <=> $a->score);

        Log::debug('[MetadataAggregator] Scored results', [
            'count' => count($scored),
            'top_source' => $scored[0]->result->source ?? null,
            'top_score' => $scored[0]->score ?? 0,
        ]);

        return $this->merger->merge($scored);
    }

    /**
     * Get sources to query (filtered by availability and optional list).
     *
     * @param  array<string>|null  $sourceNames
     * @return array<MetadataSourceInterface>
     */
    private function getActiveSources(?array $sourceNames): array
    {
        $active = [];

        foreach ($this->sources as $name => $source) {
            if ($sourceNames !== null && ! in_array($name, $sourceNames, true)) {
                continue;
            }

            if ($source->isAvailable()) {
                $active[] = $source;
            }
        }

        usort($active, fn ($a, $b) => $a->getPriority() <=> $b->getPriority());

        return $active;
    }

    /**
     * Query all sources in parallel using Http::pool.
     *
     * @param  array<MetadataSourceInterface>  $sources
     * @return array<MetadataResultDTO>
     */
    private function scatterQuery(
        MetadataQueryDTO $query,
        array $sources
    ): array {
        $asyncSources = [];
        $syncSources = [];

        foreach ($sources as $source) {
            if ($source->supportsAsync()) {
                $asyncSources[] = $source;
            } else {
                $syncSources[] = $source;
            }
        }

        $results = [];

        if (! empty($asyncSources) && config('metadata.parallel.enabled', true)) {
            $asyncResults = $this->executeParallelQueries($query, $asyncSources);
            $results = array_merge($results, $asyncResults);
        } else {
            $syncSources = array_merge($syncSources, $asyncSources);
        }

        foreach ($syncSources as $source) {
            try {
                $result = $source->query($query);

                if ($result !== null) {
                    $results[] = $result;
                }
            } catch (\Exception $e) {
                Log::warning('[MetadataAggregator] Sync source failed', [
                    'source' => $source->getSourceName(),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $results;
    }

    /**
     * Score all results for relevance to the query.
     *
     * @param  array<MetadataResultDTO>  $results
     * @return array<ScoredResultDTO>
     */
    private function scoreResults(array $results, MetadataQueryDTO $query): array
    {
        return array_map(
            fn ($result) => $this->scorer->score($result, $query),
            $results
        );
    }
}
