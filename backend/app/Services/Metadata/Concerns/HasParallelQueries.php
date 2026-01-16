<?php

declare(strict_types=1);

namespace App\Services\Metadata\Concerns;

use App\Contracts\Metadata\MetadataSourceInterface;
use App\DTOs\Metadata\MetadataQueryDTO;
use App\DTOs\Metadata\MetadataResultDTO;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Trait for executing parallel HTTP queries using Laravel's Http::pool.
 */
trait HasParallelQueries
{
    /**
     * Execute queries to multiple sources in parallel.
     *
     * @param  MetadataQueryDTO  $query
     * @param  array<MetadataSourceInterface>  $sources
     * @return array<MetadataResultDTO>
     */
    protected function executeParallelQueries(
        MetadataQueryDTO $query,
        array $sources
    ): array {
        if (empty($sources)) {
            return [];
        }

        $sourceMap = [];
        $queryBuilders = [];

        foreach ($sources as $source) {
            $builder = $source->prepareAsyncQuery($query);

            if ($builder !== null) {
                $sourceName = $source->getSourceName();
                $sourceMap[$sourceName] = $source;
                $queryBuilders[$sourceName] = $builder;
            }
        }

        if (empty($queryBuilders)) {
            return [];
        }

        $timeout = (int) config('metadata.parallel.timeout', 15);

        try {
            $responses = Http::pool(function (Pool $pool) use ($queryBuilders) {
                $requests = [];

                foreach ($queryBuilders as $sourceName => $builder) {
                    $request = $builder($pool);

                    if ($request !== null) {
                        $requests[$sourceName] = $request;
                    }
                }

                return $requests;
            });
        } catch (\Exception $e) {
            Log::error('[MetadataAggregator] Pool execution failed', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }

        $results = [];

        foreach ($responses as $sourceName => $response) {
            if (!isset($sourceMap[$sourceName])) {
                continue;
            }

            $source = $sourceMap[$sourceName];

            try {
                if ($response instanceof \Illuminate\Http\Client\Response && $response->successful()) {
                    $result = $source->parseAsyncResponse($response);

                    if ($result !== null) {
                        $results[] = $result;
                        Log::debug("[MetadataAggregator] Got result from {$sourceName}");
                    }
                } else {
                    Log::debug("[MetadataAggregator] Source {$sourceName} returned non-successful response");
                }
            } catch (\Exception $e) {
                Log::warning("[MetadataAggregator] Failed to parse response from {$sourceName}", [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $results;
    }
}
