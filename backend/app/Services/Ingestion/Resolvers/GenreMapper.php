<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Resolvers;

use App\Contracts\GenreMapperInterface;
use App\Enums\GenreEnum;
use App\Models\Genre;
use App\Models\GenreMapping;
use App\Services\Ingestion\Cleaners\GenreCleaner;
use Illuminate\Support\Facades\Log;

/**
 * Maps external genre strings to canonical Genre models.
 *
 * Uses a multi-level approach:
 * 1. Config-based mappings (from genre_mappings.php)
 * 2. Database cache (genre_mappings table)
 * 3. Fuzzy matching against GenreEnum
 * 4. Mark for LLM resolution if all else fails
 */
class GenreMapper implements GenreMapperInterface
{
    private array $unmappedGenres = [];

    public function __construct(
        private readonly GenreCleaner $cleaner
    ) {}

    /**
     * {@inheritdoc}
     */
    public function map(array $rawGenres, string $source): array
    {
        $this->unmappedGenres = [];
        $genres = [];

        Log::info('[GenreMapper] Starting genre mapping', [
            'rawGenres' => $rawGenres,
            'source' => $source,
        ]);

        $cleanResult = $this->cleaner->clean($rawGenres, $source);

        Log::info('[GenreMapper] After cleaning', [
            'normalized' => $cleanResult['normalized'],
            'mappings' => $cleanResult['mappings'],
        ]);

        foreach ($cleanResult['normalized'] as $normalized) {
            $mapping = $cleanResult['mappings'][$normalized] ?? null;

            Log::info('[GenreMapper] Processing genre', [
                'normalized' => $normalized,
                'configMapping' => $mapping,
            ]);

            if ($mapping !== null) {
                $genre = $this->getOrCreateGenre($mapping);
                Log::info('[GenreMapper] Config mapping result', [
                    'canonicalValue' => $mapping,
                    'genreFound' => $genre ? $genre->toArray() : null,
                ]);
                if ($genre && ! in_array($genre->id, array_map(fn ($g) => $g->id, $genres), true)) {
                    $genres[] = $genre;
                }

                continue;
            }

            $cachedMapping = GenreMapping::findMapping($normalized, $source);
            Log::info('[GenreMapper] Cached mapping lookup', [
                'normalized' => $normalized,
                'cachedMapping' => $cachedMapping ? $cachedMapping->toArray() : null,
            ]);
            if ($cachedMapping && $cachedMapping->genre_id) {
                $genre = Genre::find($cachedMapping->genre_id);
                if ($genre && ! in_array($genre->id, array_map(fn ($g) => $g->id, $genres), true)) {
                    $genres[] = $genre;
                }

                continue;
            }

            $this->unmappedGenres[] = $normalized;
        }

        Log::info('[GenreMapper] Final result', [
            'genreCount' => count($genres),
            'genres' => array_map(fn ($g) => $g->name, $genres),
            'unmapped' => $this->unmappedGenres,
        ]);

        return [
            'genres' => $genres,
            'unmapped' => array_unique($this->unmappedGenres),
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function mapSingle(string $rawGenre, string $source): ?Genre
    {
        $result = $this->map([$rawGenre], $source);

        return $result['genres'][0] ?? null;
    }

    /**
     * {@inheritdoc}
     */
    public function learnMapping(string $external, Genre $genre, string $source, float $confidence): void
    {
        GenreMapping::learnMapping($external, $genre, $source, $confidence);
    }

    /**
     * {@inheritdoc}
     */
    public function getUnmappedGenres(): array
    {
        return $this->unmappedGenres;
    }

    /**
     * Get or create a Genre model from a canonical value.
     */
    private function getOrCreateGenre(string $canonicalValue): ?Genre
    {
        $enum = GenreEnum::tryFrom($canonicalValue);
        if (! $enum) {
            return null;
        }

        return Genre::firstOrCreate(
            ['canonical_value' => $canonicalValue],
            [
                'name' => $enum->label(),
                'slug' => $canonicalValue,
            ]
        );
    }

    /**
     * Seed all canonical genres from GenreEnum.
     */
    public function seedCanonicalGenres(): void
    {
        $sortOrder = 0;
        $categoryOrder = [
            'fiction' => 0,
            'nonfiction' => 100,
            'special' => 200,
        ];

        foreach (GenreEnum::cases() as $enum) {
            $category = $enum->category();
            $baseOrder = $categoryOrder[$category] ?? 300;

            Genre::firstOrCreate(
                ['canonical_value' => $enum->value],
                [
                    'name' => $enum->label(),
                    'slug' => $enum->value,
                    'sort_order' => $baseOrder + $sortOrder,
                ]
            );

            $sortOrder++;
        }
    }

    /**
     * Get all genres grouped by category.
     */
    public function getGroupedGenres(): array
    {
        $genres = Genre::orderBy('sort_order')->get();

        $grouped = [
            'fiction' => [],
            'nonfiction' => [],
            'special' => [],
        ];

        foreach ($genres as $genre) {
            $category = $genre->category ?? 'special';
            $grouped[$category][] = $genre;
        }

        return $grouped;
    }
}
