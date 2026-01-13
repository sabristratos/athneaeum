<?php

declare(strict_types=1);

namespace App\Services\Stats\Concerns;

use App\Enums\GenreEnum;

/**
 * Provides genre normalization functionality for stats services.
 *
 * Maps raw genre strings from external sources (Google Books, Goodreads, etc.)
 * to canonical GenreEnum values using the genre_mappings config.
 */
trait NormalizesGenres
{
    /**
     * Cached genre mappings to avoid repeated config lookups.
     */
    private ?array $genreMappingsCache = null;

    /**
     * Normalize a raw genre string to a canonical GenreEnum value.
     *
     * @return string|null The canonical genre value or null if unmappable
     */
    protected function normalizeGenre(string $rawGenre): ?string
    {
        $mappings = $this->getGenreMappings();
        $normalized = strtolower(trim($rawGenre));

        if (isset($mappings['google_books'][$normalized])) {
            return $mappings['google_books'][$normalized];
        }

        if (isset($mappings['global'][$normalized])) {
            return $mappings['global'][$normalized];
        }

        foreach ($mappings['global'] as $key => $value) {
            if ($value !== null && str_contains($normalized, $key)) {
                return $value;
            }
        }

        foreach ($mappings['google_books'] as $key => $value) {
            if ($value !== null && str_contains($normalized, $key)) {
                return $value;
            }
        }

        return null;
    }

    /**
     * Get display label for a canonical genre value.
     */
    protected function getGenreLabel(string $canonicalGenre): string
    {
        $genreEnum = GenreEnum::tryFrom($canonicalGenre);

        return $genreEnum?->label() ?? ucfirst(str_replace('_', ' ', $canonicalGenre));
    }

    /**
     * Get category (fiction/nonfiction/special) for a canonical genre value.
     */
    protected function getGenreCategory(string $canonicalGenre): ?string
    {
        $genreEnum = GenreEnum::tryFrom($canonicalGenre);

        return $genreEnum?->category();
    }

    /**
     * Normalize an array of raw genres to canonical values.
     *
     * @param  array  $rawGenres  Array of raw genre strings
     * @return array Array of canonical genre values (duplicates removed)
     */
    protected function normalizeGenres(array $rawGenres): array
    {
        $normalized = [];

        foreach ($rawGenres as $rawGenre) {
            $canonical = $this->normalizeGenre($rawGenre);
            if ($canonical !== null && ! in_array($canonical, $normalized, true)) {
                $normalized[] = $canonical;
            }
        }

        return $normalized;
    }

    /**
     * Get genre mappings from config with caching.
     */
    private function getGenreMappings(): array
    {
        if ($this->genreMappingsCache === null) {
            $this->genreMappingsCache = [
                'global' => config('genre_mappings.global', []),
                'google_books' => config('genre_mappings.google_books', []),
            ];
        }

        return $this->genreMappingsCache;
    }
}
