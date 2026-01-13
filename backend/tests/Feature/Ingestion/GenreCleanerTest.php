<?php

declare(strict_types=1);

namespace Tests\Feature\Ingestion;

use App\Services\Ingestion\Cleaners\GenreCleaner;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class GenreCleanerTest extends TestCase
{
    private GenreCleaner $cleaner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cleaner = app(GenreCleaner::class);
    }

    public function test_returns_empty_for_null_input(): void
    {
        $result = $this->cleaner->clean(null);

        $this->assertEmpty($result['normalized']);
        $this->assertEmpty($result['mappings']);
    }

    public function test_returns_empty_for_empty_array(): void
    {
        $result = $this->cleaner->clean([]);

        $this->assertEmpty($result['normalized']);
        $this->assertEmpty($result['mappings']);
    }

    #[DataProvider('alwaysIgnoredGenresProvider')]
    public function test_ignores_always_ignored_genres(string $genre): void
    {
        $result = $this->cleaner->clean([$genre]);

        $this->assertEmpty($result['normalized']);
        $this->assertFalse($result['needsLlmEnrichment']);
    }

    public static function alwaysIgnoredGenresProvider(): array
    {
        return [
            'general' => ['General'],
            'miscellaneous' => ['Miscellaneous'],
            'other' => ['Other'],
            'books' => ['Books'],
            'ebooks' => ['Ebooks'],
            'audiobooks' => ['Audiobooks'],
        ];
    }

    #[DataProvider('genericGenresProvider')]
    public function test_keeps_generic_genres_when_alone_with_llm_flag(string $genre, string $normalized): void
    {
        $result = $this->cleaner->clean([$genre]);

        $this->assertContains($normalized, $result['normalized']);
        $this->assertTrue($result['needsLlmEnrichment']);
    }

    public static function genericGenresProvider(): array
    {
        return [
            'fiction' => ['Fiction', 'fiction'],
            'nonfiction' => ['Nonfiction', 'nonfiction'],
            'non-fiction' => ['Non-Fiction', 'non-fiction'],
        ];
    }

    public function test_ignores_generic_genres_when_specific_present(): void
    {
        $result = $this->cleaner->clean(['Fiction', 'Science Fiction', 'Fantasy']);

        $this->assertNotContains('fiction', $result['normalized']);
        $this->assertContains('science fiction', $result['normalized']);
        $this->assertContains('fantasy', $result['normalized']);
        $this->assertFalse($result['needsLlmEnrichment']);
    }

    #[DataProvider('hierarchicalGenreProvider')]
    public function test_explodes_hierarchical_genres(string $input, array $expectedParts): void
    {
        $result = $this->cleaner->clean([$input]);

        foreach ($expectedParts as $part) {
            $this->assertContains($part, $result['normalized']);
        }
    }

    public static function hierarchicalGenreProvider(): array
    {
        return [
            'slash separator' => [
                'Fiction / Science Fiction / Space Opera',
                ['science fiction', 'space opera'],
            ],
            'greater than separator' => [
                'Fiction > Mystery > Detective',
                ['mystery', 'detective'],
            ],
            'pipe separator' => [
                'Fiction | Thriller | Psychological',
                ['thriller', 'psychological'],
            ],
            'dash separator' => [
                'Fiction - Romance - Historical',
                ['romance', 'historical'],
            ],
        ];
    }

    public function test_normalizes_to_lowercase(): void
    {
        $result = $this->cleaner->clean(['SCIENCE FICTION', 'Fantasy']);

        $this->assertContains('science fiction', $result['normalized']);
        $this->assertContains('fantasy', $result['normalized']);
    }

    public function test_decodes_html_entities(): void
    {
        $result = $this->cleaner->clean(['Science &amp; Nature']);

        $this->assertContains('science & nature', $result['normalized']);
    }

    public function test_normalizes_whitespace(): void
    {
        $result = $this->cleaner->clean(['Science   Fiction']);

        $this->assertContains('science fiction', $result['normalized']);
    }

    public function test_removes_duplicates(): void
    {
        $result = $this->cleaner->clean(['Fantasy', 'fantasy', 'FANTASY']);

        $this->assertCount(1, $result['normalized']);
        $this->assertEquals(['fantasy'], $result['normalized']);
    }

    public function test_fuzzy_matches_genre_enum_values(): void
    {
        $result = $this->cleaner->clean(['science fiction']);

        $this->assertArrayHasKey('science fiction', $result['mappings']);
        $this->assertEquals('science_fiction', $result['mappings']['science fiction']);
    }

    public function test_returns_mapping_for_similar_genre_names(): void
    {
        $result = $this->cleaner->clean(['sci-fi']);

        $this->assertArrayHasKey('sci-fi', $result['mappings']);
    }

    public function test_returns_null_mapping_for_unknown_genres(): void
    {
        $result = $this->cleaner->clean(['very obscure genre name xyz']);

        $this->assertArrayHasKey('very obscure genre name xyz', $result['mappings']);
        $this->assertNull($result['mappings']['very obscure genre name xyz']);
    }

    public function test_get_canonical_genres_returns_all_enum_values(): void
    {
        $genres = $this->cleaner->getCanonicalGenres();

        $this->assertContains('science_fiction', $genres);
        $this->assertContains('fantasy', $genres);
        $this->assertContains('mystery', $genres);
        $this->assertContains('romance', $genres);
        $this->assertCount(26, $genres);
    }

    public function test_processes_multiple_genres(): void
    {
        $result = $this->cleaner->clean(['Fantasy', 'Science Fiction', 'Adventure']);

        $this->assertCount(3, $result['normalized']);
        $this->assertContains('fantasy', $result['normalized']);
        $this->assertContains('science fiction', $result['normalized']);
        $this->assertContains('adventure', $result['normalized']);
    }

    public function test_trims_whitespace_from_genres(): void
    {
        $result = $this->cleaner->clean(['  Fantasy  ', '  Mystery  ']);

        $this->assertContains('fantasy', $result['normalized']);
        $this->assertContains('mystery', $result['normalized']);
    }
}
