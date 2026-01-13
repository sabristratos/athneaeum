<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Ingestion;

use App\Services\Authors\AuthorNormalizer;
use App\Services\Ingestion\Cleaners\AuthorCleaner;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class AuthorCleanerTest extends TestCase
{
    private AuthorCleaner $cleaner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cleaner = new AuthorCleaner(new AuthorNormalizer);
    }

    public function test_returns_unknown_author_for_empty_string(): void
    {
        $result = $this->cleaner->clean('');

        $this->assertCount(1, $result);
        $this->assertEquals('Unknown Author', $result[0]->name);
    }

    public function test_returns_unknown_author_for_null(): void
    {
        $result = $this->cleaner->clean(null);

        $this->assertCount(1, $result);
        $this->assertEquals('Unknown Author', $result[0]->name);
    }

    #[DataProvider('blockedNamesProvider')]
    public function test_returns_unknown_for_blocklisted_names(string $name): void
    {
        $result = $this->cleaner->clean($name);

        $this->assertCount(1, $result);
        $this->assertEquals('Unknown Author', $result[0]->name);
    }

    public static function blockedNamesProvider(): array
    {
        return [
            'unknown' => ['unknown'],
            'Unknown uppercase' => ['Unknown'],
            'various' => ['various'],
            'various authors' => ['Various Authors'],
            'anonymous' => ['Anonymous'],
            'n/a' => ['n/a'],
            'na' => ['NA'],
        ];
    }

    #[DataProvider('lastFirstFormatProvider')]
    public function test_flips_last_first_format(string $input, string $expectedName): void
    {
        $result = $this->cleaner->clean($input);

        $this->assertCount(1, $result);
        $this->assertEquals($expectedName, $result[0]->name);
    }

    public static function lastFirstFormatProvider(): array
    {
        return [
            'simple last first' => ['Tolkien, J.R.R.', 'J.R.R. Tolkien'],
            'with initials' => ['Rowling, J.K.', 'J.K. Rowling'],
            'single initial' => ['King, S.', 'S. King'],
            'full names flipped' => ['Smith, John', 'John Smith'],
        ];
    }

    #[DataProvider('multiAuthorProvider')]
    public function test_splits_multiple_authors(string $input, int $expectedCount, array $expectedNames): void
    {
        $result = $this->cleaner->clean($input);

        $this->assertCount($expectedCount, $result);
        foreach ($expectedNames as $index => $name) {
            $this->assertEquals($name, $result[$index]->name);
        }
    }

    public static function multiAuthorProvider(): array
    {
        return [
            'semicolon separated' => [
                'Stephen King; Peter Straub',
                2,
                ['Stephen King', 'Peter Straub'],
            ],
            'and separated' => [
                'Neil Gaiman and Terry Pratchett',
                2,
                ['Neil Gaiman', 'Terry Pratchett'],
            ],
            'ampersand separated' => [
                'Douglas Preston & Lincoln Child',
                2,
                ['Douglas Preston', 'Lincoln Child'],
            ],
            'with separated' => [
                'James Patterson with Maxine Paetro',
                2,
                ['James Patterson', 'Maxine Paetro'],
            ],
        ];
    }

    #[DataProvider('roleExtractionProvider')]
    public function test_extracts_roles_from_author_names(string $input, string $expectedRole): void
    {
        $result = $this->cleaner->clean($input);

        $this->assertCount(1, $result);
        $this->assertEquals($expectedRole, $result[0]->role);
    }

    public static function roleExtractionProvider(): array
    {
        return [
            'editor role' => ['John Smith (Editor)', 'editor'],
            'illustrator role' => ['Jane Doe (Illustrator)', 'illustrator'],
            'translator role' => ['Carlos Ruiz (Translator)', 'translator'],
            'narrator role' => ['Morgan Freeman (Narrator)', 'narrator'],
            'default author role' => ['Stephen King', 'author'],
        ];
    }

    public function test_generates_sort_name(): void
    {
        $result = $this->cleaner->clean('J.K. Rowling');

        $this->assertCount(1, $result);
        $this->assertEquals('Rowling, J.K.', $result[0]->sortName);
    }

    public function test_generates_slug(): void
    {
        $result = $this->cleaner->clean('J.K. Rowling');

        $this->assertCount(1, $result);
        $this->assertEquals('jk-rowling', $result[0]->slug);
    }

    public function test_handles_particles_in_sort_name(): void
    {
        $result = $this->cleaner->clean('Ursula K. Le Guin');

        $this->assertCount(1, $result);
        $this->assertEquals('le Guin, Ursula K.', $result[0]->sortName);
    }

    public function test_handles_html_entities(): void
    {
        $result = $this->cleaner->clean('John &amp; Jane Doe');

        $this->assertCount(2, $result);
    }

    public function test_resolves_known_aliases(): void
    {
        $result = $this->cleaner->clean('Robert Galbraith');

        $this->assertCount(1, $result);
        $this->assertEquals('J.K. Rowling', $result[0]->name);
    }
}
