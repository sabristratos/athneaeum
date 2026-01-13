<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Cleaners;

use App\Enums\GenreEnum;
use Illuminate\Support\Facades\Log;

/**
 * Handles genre string sanitization and initial mapping.
 *
 * This cleaner performs Level 1 (code-based) genre processing:
 * - Explodes hierarchical paths
 * - Normalizes strings
 * - Attempts config-based mapping
 *
 * Unknown genres are flagged for Level 2 (LLM) processing.
 */
class GenreCleaner
{
    /**
     * Path separators used in hierarchical genres.
     * "Fiction / Science Fiction / Space Opera"
     */
    private const PATH_SEPARATORS = ['/', '>', '|', ' - '];

    /**
     * Genres to always ignore (never useful).
     */
    private const ALWAYS_IGNORE = [
        'general',
        'miscellaneous',
        'other',
        'books',
        'ebooks',
        'audiobooks',
    ];

    /**
     * Generic genres to ignore only when more specific genres are present.
     */
    private const GENERIC_GENRES = [
        'fiction',
        'nonfiction',
        'non-fiction',
    ];

    /**
     * Clean and normalize genre strings.
     *
     * @param  array<string>|null  $genres  Raw genre strings
     * @param  string  $source  The source provider
     * @return array{normalized: array<string>, mappings: array<string, string|null>, needsLlmEnrichment: bool, originalGenres: array<string>}
     */
    public function clean(?array $genres, string $source = 'unknown'): array
    {
        Log::info('[GenreCleaner] Starting clean', [
            'inputGenres' => $genres,
            'source' => $source,
        ]);

        if (empty($genres)) {
            Log::info('[GenreCleaner] Empty genres input');

            return [
                'normalized' => [],
                'mappings' => [],
                'needsLlmEnrichment' => false,
                'originalGenres' => [],
            ];
        }

        $allGenres = [];
        $genericGenres = [];

        foreach ($genres as $genre) {
            $parts = $this->explodeGenrePath($genre);
            Log::info('[GenreCleaner] Exploded genre path', [
                'original' => $genre,
                'parts' => $parts,
            ]);

            foreach ($parts as $part) {
                $clean = $this->normalizeGenre($part);

                if (empty($clean)) {
                    Log::info('[GenreCleaner] Skipping empty genre');

                    continue;
                }

                if (in_array($clean, self::ALWAYS_IGNORE, true)) {
                    Log::info('[GenreCleaner] Skipping always-ignored genre', ['genre' => $clean]);

                    continue;
                }

                if (in_array($clean, $allGenres, true) || in_array($clean, $genericGenres, true)) {
                    Log::info('[GenreCleaner] Skipping duplicate genre', ['genre' => $clean]);

                    continue;
                }

                if (in_array($clean, self::GENERIC_GENRES, true)) {
                    Log::info('[GenreCleaner] Found generic genre (may keep if no specific genres)', ['genre' => $clean]);
                    $genericGenres[] = $clean;

                    continue;
                }

                $allGenres[] = $clean;
            }
        }

        $needsLlmEnrichment = false;

        if (empty($allGenres) && ! empty($genericGenres)) {
            Log::info('[GenreCleaner] No specific genres found, using generic genres with LLM enrichment flag', [
                'genericGenres' => $genericGenres,
            ]);
            $needsLlmEnrichment = true;
            $allGenres = $genericGenres;
        } elseif (! empty($genericGenres)) {
            Log::info('[GenreCleaner] Ignoring generic genres (specific genres found)', [
                'specificGenres' => $allGenres,
                'ignoredGeneric' => $genericGenres,
            ]);
        }

        $normalized = [];
        $mappings = [];

        foreach ($allGenres as $clean) {
            $normalized[] = $clean;
            $configMapping = $this->getConfigMapping($clean, $source);
            Log::info('[GenreCleaner] Config mapping result', [
                'normalizedGenre' => $clean,
                'mapping' => $configMapping,
            ]);
            $mappings[$clean] = $configMapping;
        }

        Log::info('[GenreCleaner] Clean complete', [
            'normalized' => $normalized,
            'mappings' => $mappings,
            'needsLlmEnrichment' => $needsLlmEnrichment,
        ]);

        return [
            'normalized' => $normalized,
            'mappings' => $mappings,
            'needsLlmEnrichment' => $needsLlmEnrichment,
            'originalGenres' => $genres,
        ];
    }

    /**
     * Explode a hierarchical genre path into parts.
     *
     * @return array<string>
     */
    private function explodeGenrePath(string $genre): array
    {
        foreach (self::PATH_SEPARATORS as $separator) {
            if (str_contains($genre, $separator)) {
                return array_filter(array_map('trim', explode($separator, $genre)));
            }
        }

        return [trim($genre)];
    }

    /**
     * Normalize a single genre string.
     */
    private function normalizeGenre(string $genre): string
    {
        $genre = trim($genre);
        $genre = html_entity_decode($genre, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $genre = preg_replace('/\s+/', ' ', $genre);

        return strtolower($genre);
    }

    /**
     * Get config-based mapping for a genre.
     *
     * @return string|null The canonical GenreEnum value, or null if not found
     */
    private function getConfigMapping(string $normalizedGenre, string $source): ?string
    {
        $sourceConfig = config("genre_mappings.{$source}", []);
        if (isset($sourceConfig[$normalizedGenre])) {
            return $sourceConfig[$normalizedGenre];
        }

        $globalConfig = config('genre_mappings.global', []);
        if (isset($globalConfig[$normalizedGenre])) {
            return $globalConfig[$normalizedGenre];
        }

        $fuzzyMatch = $this->fuzzyMatchEnum($normalizedGenre);
        if ($fuzzyMatch !== null) {
            return $fuzzyMatch;
        }

        return null;
    }

    /**
     * Attempt to fuzzy match against GenreEnum values.
     */
    private function fuzzyMatchEnum(string $normalizedGenre): ?string
    {
        foreach (GenreEnum::cases() as $enum) {
            $enumNormalized = strtolower(str_replace('_', ' ', $enum->value));
            $enumLabel = strtolower($enum->label());

            if ($normalizedGenre === $enumNormalized || $normalizedGenre === $enumLabel) {
                return $enum->value;
            }

            if (str_contains($normalizedGenre, $enumNormalized) || str_contains($enumNormalized, $normalizedGenre)) {
                similar_text($normalizedGenre, $enumNormalized, $percent);
                if ($percent >= 80) {
                    return $enum->value;
                }
            }
        }

        return null;
    }

    /**
     * Get all GenreEnum values for reference.
     *
     * @return array<string>
     */
    public function getCanonicalGenres(): array
    {
        return array_map(fn (GenreEnum $g) => $g->value, GenreEnum::cases());
    }
}
