<?php

declare(strict_types=1);

namespace App\Services\Catalog;

use App\Models\Genre;
use App\Models\UnmappedGenre;
use App\Services\Ingestion\Resolvers\GenreMapper;
use Illuminate\Support\Collection;

/**
 * Maps raw catalog genres to canonical Genre models.
 *
 * Tracks unmapped genres for future mapping improvements.
 */
class CatalogGenreService
{
    private const SOURCE_CATALOG = 'catalog';

    public function __construct(
        private readonly GenreMapper $mapper,
    ) {}

    /**
     * Map raw genres to canonical Genre models.
     *
     * @param  array<string>  $rawGenres
     * @return Collection<int, Genre>
     */
    public function mapGenres(array $rawGenres): Collection
    {
        if (empty($rawGenres)) {
            return collect();
        }

        $result = $this->mapper->map($rawGenres, self::SOURCE_CATALOG);

        foreach ($result['unmapped'] as $unmapped) {
            $this->trackUnmapped($unmapped);
        }

        return collect($result['genres']);
    }

    /**
     * Map a single genre string.
     */
    public function mapSingle(string $rawGenre): ?Genre
    {
        $result = $this->mapGenres([$rawGenre]);

        return $result->first();
    }

    /**
     * Track an unmapped genre for future resolution.
     */
    private function trackUnmapped(string $rawGenre): void
    {
        UnmappedGenre::track($rawGenre);
    }

    /**
     * Get the most common unmapped genres.
     *
     * @return Collection<int, UnmappedGenre>
     */
    public function getTopUnmapped(int $limit = 50): Collection
    {
        return UnmappedGenre::mostCommon()
            ->needsSuggestion()
            ->limit($limit)
            ->get();
    }

    /**
     * Suggest a mapping for an unmapped genre.
     */
    public function suggestMapping(UnmappedGenre $unmapped, string $canonicalValue): void
    {
        $unmapped->update(['suggested_mapping' => $canonicalValue]);
    }

    /**
     * Apply a suggested mapping and learn it.
     */
    public function applySuggestion(UnmappedGenre $unmapped): ?Genre
    {
        if (! $unmapped->suggested_mapping) {
            return null;
        }

        $genre = Genre::where('canonical_value', $unmapped->suggested_mapping)->first();
        if (! $genre) {
            return null;
        }

        $this->mapper->learnMapping(
            $unmapped->raw_genre,
            $genre,
            self::SOURCE_CATALOG,
            0.9
        );

        return $genre;
    }
}
