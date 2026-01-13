<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Publisher;

/**
 * Contract for resolving and creating publishers.
 */
interface PublisherResolverInterface
{
    /**
     * Find or create a publisher by name.
     */
    public function findOrCreate(string $name): Publisher;

    /**
     * Find a publisher by slug.
     */
    public function findBySlug(string $slug): ?Publisher;

    /**
     * Find similar publishers using fuzzy matching.
     *
     * @param  float  $threshold  Similarity threshold (0.0 to 1.0)
     * @return array<Publisher>
     */
    public function findSimilar(string $name, float $threshold = 0.85): array;
}
