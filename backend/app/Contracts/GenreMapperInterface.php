<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Genre;

/**
 * Contract for mapping external genres to canonical genres.
 *
 * Uses config-based mappings, database cache, and fuzzy matching
 * to resolve external genre strings to Genre models.
 */
interface GenreMapperInterface
{
    /**
     * Map an array of raw genre strings to Genre models.
     *
     * @param  array<string>  $rawGenres  Raw genre strings from external source
     * @param  string  $source  The source provider (google_books, goodreads, opds)
     * @return array{genres: array<Genre>, unmapped: array<string>}
     */
    public function map(array $rawGenres, string $source): array;

    /**
     * Map a single genre string to a Genre model.
     *
     * @return Genre|null The mapped genre, or null if unmapped
     */
    public function mapSingle(string $rawGenre, string $source): ?Genre;

    /**
     * Learn a new mapping and cache it in the database.
     *
     * @param  string  $external  The external genre string
     * @param  Genre  $genre  The canonical genre to map to
     * @param  string  $source  The source provider
     * @param  float  $confidence  Confidence level (0.0 to 1.0)
     */
    public function learnMapping(string $external, Genre $genre, string $source, float $confidence): void;

    /**
     * Get all unmapped genres that need LLM resolution.
     *
     * @return array<string>
     */
    public function getUnmappedGenres(): array;
}
