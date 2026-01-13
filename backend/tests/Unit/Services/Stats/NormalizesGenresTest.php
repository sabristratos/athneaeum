<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Stats;

use App\Services\Stats\Concerns\NormalizesGenres;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Unit tests for the NormalizesGenres trait.
 *
 * Tests genre normalization from raw external source genres to canonical GenreEnum values.
 * Extends Laravel TestCase because GenreEnum::label() uses the translator.
 */
class NormalizesGenresTest extends TestCase
{
    private object $normalizer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->normalizer = new class
        {
            use NormalizesGenres;

            public function normalize(string $genre): ?string
            {
                return $this->normalizeGenre($genre);
            }

            public function label(string $canonicalGenre): string
            {
                return $this->getGenreLabel($canonicalGenre);
            }

            public function category(string $canonicalGenre): ?string
            {
                return $this->getGenreCategory($canonicalGenre);
            }

            public function normalizeAll(array $genres): array
            {
                return $this->normalizeGenres($genres);
            }

            public function setMappings(array $mappings): void
            {
                $reflection = new \ReflectionClass($this);
                $property = $reflection->getProperty('genreMappingsCache');
                $property->setAccessible(true);
                $property->setValue($this, $mappings);
            }
        };

        $this->normalizer->setMappings([
            'global' => [
                'science fiction' => 'science_fiction',
                'sci-fi' => 'science_fiction',
                'fantasy' => 'fantasy',
                'mystery' => 'mystery',
                'romance' => 'romance',
                'thriller' => 'thriller',
                'horror' => 'horror',
                'literary' => 'literary',
                'literary fiction' => 'literary',
                'biography' => 'biography',
                'history' => 'history',
                'self-help' => 'self_help',
                'fiction' => null,
            ],
            'google_books' => [
                'fiction / science fiction / space opera' => 'science_fiction',
                'fiction / science fiction / general' => 'science_fiction',
                'fiction / fantasy / epic' => 'fantasy',
                'fiction / fantasy / general' => 'fantasy',
                'fiction / mystery & detective' => 'mystery',
                'fiction / thrillers / suspense' => 'thriller',
                'fiction / horror' => 'horror',
                'fiction / literary' => 'literary',
                'biography & autobiography' => 'biography',
                'history / general' => 'history',
            ],
        ]);
    }

    #[DataProvider('genreNormalizationProvider')]
    public function test_normalizes_genre_to_canonical_value(string $rawGenre, ?string $expectedCanonical): void
    {
        $result = $this->normalizer->normalize($rawGenre);
        $this->assertSame($expectedCanonical, $result);
    }

    public static function genreNormalizationProvider(): array
    {
        return [
            'exact match lowercase' => ['science fiction', 'science_fiction'],
            'exact match mixed case' => ['Science Fiction', 'science_fiction'],
            'exact match uppercase' => ['SCIENCE FICTION', 'science_fiction'],
            'alternative name' => ['sci-fi', 'science_fiction'],
            'google books nested' => ['Fiction / Science Fiction / Space Opera', 'science_fiction'],
            'google books general' => ['Fiction / Science Fiction / General', 'science_fiction'],
            'fantasy exact' => ['fantasy', 'fantasy'],
            'fantasy google books' => ['Fiction / Fantasy / Epic', 'fantasy'],
            'mystery exact' => ['mystery', 'mystery'],
            'mystery google books' => ['Fiction / Mystery & Detective', 'mystery'],
            'biography' => ['biography', 'biography'],
            'biography google books' => ['Biography & Autobiography', 'biography'],
            'history google books' => ['History / General', 'history'],
            'unmapped genre' => ['Some Random Genre', null],
            'partial match sci-fi' => ['Hard Science Fiction Adventures', 'science_fiction'],
            'explicit null mapping' => ['Fiction', null],
            'fiction general should be null' => ['fiction', null],
        ];
    }

    #[DataProvider('genreLabelProvider')]
    public function test_returns_correct_label_for_canonical_genre(string $canonicalGenre, string $expectedLabel): void
    {
        $result = $this->normalizer->label($canonicalGenre);
        $this->assertSame($expectedLabel, $result);
    }

    public static function genreLabelProvider(): array
    {
        return [
            'science fiction' => ['science_fiction', 'Science Fiction'],
            'fantasy' => ['fantasy', 'Fantasy'],
            'mystery' => ['mystery', 'Mystery'],
            'literary (enum value)' => ['literary', 'Literary Fiction'],
            'unknown genre fallback' => ['unknown_genre', 'Unknown genre'],
        ];
    }

    public function test_normalizes_array_of_genres(): void
    {
        $rawGenres = [
            'Science Fiction',
            'sci-fi',
            'Fantasy',
            'Fiction / Fantasy / Epic',
            'Unknown Genre',
            'Fiction',
        ];

        $result = $this->normalizer->normalizeAll($rawGenres);

        $this->assertCount(2, $result);
        $this->assertContains('science_fiction', $result);
        $this->assertContains('fantasy', $result);
        $this->assertNotContains('unknown_genre', $result);
        $this->assertNotContains(null, $result);
    }

    public function test_removes_duplicate_canonical_genres(): void
    {
        $rawGenres = [
            'Science Fiction',
            'sci-fi',
            'Fiction / Science Fiction / Space Opera',
            'Fiction / Science Fiction / General',
        ];

        $result = $this->normalizer->normalizeAll($rawGenres);

        $this->assertCount(1, $result);
        $this->assertSame(['science_fiction'], $result);
    }

    public function test_handles_empty_array(): void
    {
        $result = $this->normalizer->normalizeAll([]);
        $this->assertSame([], $result);
    }

    public function test_handles_whitespace_in_genre_names(): void
    {
        $this->assertSame('science_fiction', $this->normalizer->normalize('  Science Fiction  '));
        $this->assertSame('fantasy', $this->normalizer->normalize("\tFantasy\n"));
    }
}
