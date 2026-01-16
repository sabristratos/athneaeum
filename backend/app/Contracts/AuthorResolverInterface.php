<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\Ingestion\AuthorDTO;
use App\Models\Author;
use Illuminate\Support\Collection;

/**
 * Contract for resolving and creating authors.
 *
 * Handles fuzzy matching, alias resolution, and author creation.
 */
interface AuthorResolverInterface
{
    /**
     * Resolve a raw author string into Author models.
     *
     * Handles multiple authors separated by commas, semicolons, or "and".
     *
     * @return array<Author>
     */
    public function resolve(string $rawAuthorString): array;

    /**
     * Resolve authors with Open Library enrichment for catalog ingestion.
     *
     * Skips "Unknown Author" entries and enriches new authors with
     * Open Library data when available.
     *
     * @return Collection<int, Author>
     */
    public function resolveWithEnrichment(string $rawAuthorString): Collection;

    /**
     * Find or create an author from a DTO.
     *
     * @param  bool  $enrichWithOpenLibrary  If true, fetch data from Open Library for new authors
     */
    public function findOrCreate(AuthorDTO $dto, bool $enrichWithOpenLibrary = false): Author;

    /**
     * Find an author by slug.
     */
    public function findBySlug(string $slug): ?Author;

    /**
     * Find similar authors using fuzzy matching.
     *
     * @param  float  $threshold  Similarity threshold (0.0 to 1.0)
     */
    public function findSimilar(string $name, float $threshold = 0.85): Collection;

    /**
     * Check if an alias exists and return the canonical author.
     */
    public function findByAlias(string $alias): ?Author;
}
