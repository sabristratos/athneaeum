<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Ingestion;

use App\Services\Ingestion\Cleaners\IsbnCleaner;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class IsbnCleanerTest extends TestCase
{
    private IsbnCleaner $cleaner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cleaner = new IsbnCleaner;
    }

    public function test_returns_null_for_empty_input(): void
    {
        $result = $this->cleaner->clean(null, null);

        $this->assertNull($result['isbn10']);
        $this->assertNull($result['isbn13']);
        $this->assertFalse($result['valid']);
    }

    #[DataProvider('validIsbn10Provider')]
    public function test_validates_isbn10(string $isbn, bool $expectedValid): void
    {
        $result = $this->cleaner->clean($isbn);

        $this->assertEquals($expectedValid, $result['valid'], "Failed for ISBN: {$isbn}");
        if ($expectedValid) {
            $this->assertNotNull($result['isbn10']);
        }
    }

    public static function validIsbn10Provider(): array
    {
        return [
            'valid ISBN-10' => ['0451526538', true],
            'valid with X checksum' => ['080442957X', true],
            'invalid checksum' => ['0451526539', false],
            'too short' => ['045152653', false],
            'too long' => ['04515265381', false],
        ];
    }

    #[DataProvider('validIsbn13Provider')]
    public function test_validates_isbn13(string $isbn, bool $expectedValid): void
    {
        $result = $this->cleaner->clean(null, $isbn);

        $this->assertEquals($expectedValid, $result['valid'], "Failed for ISBN-13: {$isbn}");
        if ($expectedValid) {
            $this->assertNotNull($result['isbn13']);
        }
    }

    public static function validIsbn13Provider(): array
    {
        return [
            'valid ISBN-13' => ['9780451526533', true],
            'another valid ISBN-13' => ['9780743273565', true],
            'invalid checksum' => ['9780451526532', false],
            'too short' => ['978045152653', false],
            'too long' => ['97804515265331', false],
        ];
    }

    #[DataProvider('formattedIsbnProvider')]
    public function test_normalizes_formatted_isbns(string $input, ?string $expectedIsbn10, ?string $expectedIsbn13): void
    {
        $result = $this->cleaner->clean($input);

        $this->assertEquals($expectedIsbn10, $result['isbn10']);
        $this->assertEquals($expectedIsbn13, $result['isbn13']);
    }

    public static function formattedIsbnProvider(): array
    {
        return [
            'ISBN-10 with dashes' => ['0-451-52653-8', '0451526538', null],
            'ISBN-10 with spaces' => ['0 451 52653 8', '0451526538', null],
            'ISBN-13 with dashes' => ['978-0-451-52653-3', null, '9780451526533'],
            'ISBN-13 with spaces' => ['978 0 451 52653 3', null, '9780451526533'],
        ];
    }

    public function test_moves_13_digit_isbn_from_isbn10_to_isbn13(): void
    {
        $result = $this->cleaner->clean('9780451526533');

        $this->assertNull($result['isbn10']);
        $this->assertEquals('9780451526533', $result['isbn13']);
        $this->assertTrue($result['valid']);
    }

    public function test_handles_both_isbns(): void
    {
        $result = $this->cleaner->clean('0451526538', '9780451526533');

        $this->assertEquals('0451526538', $result['isbn10']);
        $this->assertEquals('9780451526533', $result['isbn13']);
        $this->assertTrue($result['valid']);
    }

    public function test_isbn10_to_13_conversion(): void
    {
        $result = $this->cleaner->isbn10To13('0451526538');

        $this->assertEquals('9780451526533', $result);
    }

    public function test_isbn13_to_10_conversion(): void
    {
        $result = $this->cleaner->isbn13To10('9780451526533');

        $this->assertEquals('0451526538', $result);
    }

    public function test_isbn13_to_10_returns_null_for_979_prefix(): void
    {
        $result = $this->cleaner->isbn13To10('9791234567896');

        $this->assertNull($result);
    }

    public function test_handles_lowercase_x(): void
    {
        $result = $this->cleaner->clean('080442957x');

        $this->assertEquals('080442957X', $result['isbn10']);
        $this->assertTrue($result['valid']);
    }
}
