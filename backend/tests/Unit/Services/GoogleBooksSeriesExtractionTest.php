<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\BookSearch\GoogleBooksService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

class GoogleBooksSeriesExtractionTest extends TestCase
{
    private GoogleBooksService $service;

    private ReflectionMethod $extractSeriesInfo;

    private ReflectionMethod $extractVolumeNumber;

    private ReflectionMethod $isValidSeriesExtraction;

    private ReflectionMethod $normalizeText;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new GoogleBooksService;

        $reflection = new ReflectionClass($this->service);

        $this->extractSeriesInfo = $reflection->getMethod('extractSeriesInfo');
        $this->extractSeriesInfo->setAccessible(true);

        $this->extractVolumeNumber = $reflection->getMethod('extractVolumeNumber');
        $this->extractVolumeNumber->setAccessible(true);

        $this->isValidSeriesExtraction = $reflection->getMethod('isValidSeriesExtraction');
        $this->isValidSeriesExtraction->setAccessible(true);

        $this->normalizeText = $reflection->getMethod('normalizeText');
        $this->normalizeText->setAccessible(true);
    }

    #[DataProvider('famousSeriesProvider')]
    public function test_extracts_famous_series_correctly(
        string $title,
        ?string $subtitle,
        string $expectedSeries,
        int $expectedVolume
    ): void {
        $volumeInfo = ['title' => $title];
        if ($subtitle !== null) {
            $volumeInfo['subtitle'] = $subtitle;
        }

        $result = $this->extractSeriesInfo->invoke($this->service, $volumeInfo);

        $this->assertEquals(
            $expectedSeries,
            $result['series_name'],
            "Series name mismatch for: {$title}"
        );
        $this->assertEquals(
            $expectedVolume,
            $result['volume_number'],
            "Volume number mismatch for: {$title}"
        );
    }

    public static function famousSeriesProvider(): array
    {
        return [
            'Stormlight Archive #1' => [
                'The Way of Kings (Stormlight Archive, #1)',
                null,
                'Stormlight Archive',
                1,
            ],
            'Stormlight Archive #2' => [
                'Words of Radiance (Stormlight Archive, #2)',
                null,
                'Stormlight Archive',
                2,
            ],
            'A Song of Ice and Fire' => [
                'A Game of Thrones (A Song of Ice and Fire, Book 1)',
                null,
                'A Song of Ice and Fire',
                1,
            ],
            'Harry Potter #1' => [
                'Harry Potter and the Philosopher\'s Stone (Harry Potter, #1)',
                null,
                'Harry Potter',
                1,
            ],
            'Harry Potter #7' => [
                'Harry Potter and the Deathly Hallows (Harry Potter, #7)',
                null,
                'Harry Potter',
                7,
            ],
            'Lord of the Rings Part format' => [
                'The Fellowship of the Ring (The Lord of the Rings, Part 1)',
                null,
                'The Lord of the Rings',
                1,
            ],
            'Divergent' => [
                'Divergent (Divergent, #1)',
                null,
                'Divergent',
                1,
            ],
            'Hunger Games' => [
                'The Hunger Games (The Hunger Games, #1)',
                null,
                'The Hunger Games',
                1,
            ],
            'Percy Jackson' => [
                'The Lightning Thief (Percy Jackson and the Olympians, #1)',
                null,
                'Percy Jackson and the Olympians',
                1,
            ],
            'Wheel of Time' => [
                'The Eye of the World (Wheel of Time, #1)',
                null,
                'Wheel of Time',
                1,
            ],
            'Kingkiller Chronicle' => [
                'The Name of the Wind (Kingkiller Chronicle, #1)',
                null,
                'Kingkiller Chronicle',
                1,
            ],
            'Ender\'s Saga' => [
                'Ender\'s Game (Ender\'s Saga, #1)',
                null,
                'Ender\'s Saga',
                1,
            ],
            'Foundation' => [
                'Foundation (Foundation, #1)',
                null,
                'Foundation',
                1,
            ],
            'Dark Tower' => [
                'The Gunslinger (The Dark Tower, #1)',
                null,
                'The Dark Tower',
                1,
            ],
            'Dune with Book word' => [
                'Dune (Dune Chronicles, Book 1)',
                null,
                'Dune Chronicles',
                1,
            ],
        ];
    }

    #[DataProvider('falsePositiveProvider')]
    public function test_rejects_false_positives(
        string $title,
        ?string $subtitle
    ): void {
        $volumeInfo = ['title' => $title];
        if ($subtitle !== null) {
            $volumeInfo['subtitle'] = $subtitle;
        }

        $result = $this->extractSeriesInfo->invoke($this->service, $volumeInfo);

        $this->assertNull(
            $result['series_name'],
            "Should not extract series from: {$title}"
        );
        $this->assertNull(
            $result['volume_number'],
            "Should not extract volume from: {$title}"
        );
    }

    public static function falsePositiveProvider(): array
    {
        return [
            '1984 - classic numeric title' => ['1984', null],
            'Catch-22 - numeric in title' => ['Catch-22', null],
            'Fahrenheit 451 - numeric title' => ['Fahrenheit 451', null],
            'Slaughterhouse-Five - word number' => ['Slaughterhouse-Five', null],
            '2001 Space Odyssey - year title' => ['2001: A Space Odyssey', null],
            '1Q84 - variant numeric' => ['1Q84', null],
            'Complete Works - compilation' => ['The Complete Works of Shakespeare', null],
            '3rd Edition - edition indicator' => ['Python Programming', '3rd Edition'],
            'Anniversary Edition' => ['The Hobbit', '75th Anniversary Edition'],
            'Deluxe Edition' => ['Dune', 'Deluxe Edition'],
            'Illustrated Edition' => ['Harry Potter', 'Illustrated Edition'],
            'Omnibus - compilation' => ['Foundation Omnibus', null],
            'Box Set indicator' => ['Harry Potter Box Set Books 1-7', null],
        ];
    }

    #[DataProvider('volumeNumberFormatProvider')]
    public function test_extracts_volume_numbers_in_various_formats(
        string $text,
        int $expectedVolume
    ): void {
        $result = $this->extractVolumeNumber->invoke($this->service, $text);

        $this->assertEquals(
            $expectedVolume,
            $result,
            "Volume extraction failed for: {$text}"
        );
    }

    public static function volumeNumberFormatProvider(): array
    {
        return [
            'Book with digit' => ['Series Name Book 1', 1],
            'Book with digit 2' => ['Series Name Book 2', 2],
            'Book with digit 10' => ['Series Name Book 10', 10],
            'Volume with digit' => ['Series Name Volume 3', 3],
            'Vol. abbreviation' => ['Series Name Vol. 4', 4],
            'Part with digit' => ['Series Name Part 5', 5],
            'Hash number' => ['Series Name #6', 6],
            'Episode' => ['Series Name Episode 7', 7],
            'Story number' => ['Series Name Story #8', 8],
            'Book One word' => ['Series Name Book One', 1],
            'Book Two word' => ['Series Name Book Two', 2],
            'Book Three word' => ['Series Name Book Three', 3],
            'Volume One word' => ['Series Name Volume One', 1],
            'First Book ordinal' => ['First Book of Series', 1],
            'Second Volume ordinal' => ['Second Volume of Series', 2],
            'Third Part ordinal' => ['Third Part of Series', 3],
            'Roman numeral I' => ['Series Name Book I', 1],
            'Roman numeral II' => ['Series Name Book II', 2],
            'Roman numeral III' => ['Series Name Book III', 3],
            'Roman numeral IV' => ['Series Name Volume IV', 4],
            'Roman numeral V' => ['Series Name Part V', 5],
            '1st ordinal' => ['1st Book in Series', 1],
            '2nd ordinal' => ['2nd Book in Series', 2],
            '3rd ordinal' => ['3rd Novel in Series', 3],
            'Installment' => ['Series Installment 4', 4],
            'Arc number' => ['Series Arc 2', 2],
        ];
    }

    #[DataProvider('textNormalizationProvider')]
    public function test_normalizes_text_correctly(
        string $input,
        string $expected
    ): void {
        $result = $this->normalizeText->invoke($this->service, $input);

        $this->assertEquals($expected, $result);
    }

    public static function textNormalizationProvider(): array
    {
        return [
            'em dash to hyphen' => ['Series — Book 1', 'Series - Book 1'],
            'en dash to hyphen' => ['Series – Book 1', 'Series - Book 1'],
            'curly double quotes' => ['"Series Name"', '"Series Name"'],
            'curly single quotes' => ['Series\'s Name', "Series's Name"],
            'multiple spaces' => ['Series   Name', 'Series Name'],
            'leading/trailing spaces' => ['  Series Name  ', 'Series Name'],
            'mixed special chars' => ['"Series" — Part 1', '"Series" - Part 1'],
        ];
    }

    #[DataProvider('validationProvider')]
    public function test_validates_series_extraction(
        string $title,
        ?string $seriesName,
        ?int $volumeNumber,
        bool $expectedValid
    ): void {
        $result = $this->isValidSeriesExtraction->invoke(
            $this->service,
            $title,
            $seriesName,
            $volumeNumber
        );

        $this->assertEquals(
            $expectedValid,
            $result,
            "Validation mismatch for: {$title} / {$seriesName}"
        );
    }

    public static function validationProvider(): array
    {
        return [
            'valid series' => ['Book Title', 'Series Name', 1, true],
            'null series name' => ['Book Title', null, 1, false],
            'null volume' => ['Book Title', 'Series Name', null, false],
            'series too short' => ['Book Title', 'A', 1, false],
            'numeric series name' => ['Book Title', '123', 1, false],
            'negative volume' => ['Book Title', 'Series Name', -1, false],
            'volume too high' => ['Book Title', 'Series Name', 1000, false],
            'edition in title' => ['Book 3rd Edition', 'Book', 3, false],
            'anniversary in title' => ['Book Anniversary Edition', 'Book', 1, false],
            'omnibus in title' => ['Series Omnibus', 'Series', 1, false],
            '1984 as series' => ['1984', '1984', 1, false],
            'catch-22 as series' => ['Catch-22', 'catch-22', 1, false],
        ];
    }

    public function test_handles_subtitle_in_series_extraction(): void
    {
        $volumeInfo = [
            'title' => 'Mistborn: The Final Empire',
            'subtitle' => 'Book 1',
        ];

        $result = $this->extractSeriesInfo->invoke($this->service, $volumeInfo);

        $this->assertEquals(1, $result['volume_number']);
    }

    public function test_handles_empty_title(): void
    {
        $volumeInfo = ['title' => ''];

        $result = $this->extractSeriesInfo->invoke($this->service, $volumeInfo);

        $this->assertNull($result['series_name']);
        $this->assertNull($result['volume_number']);
    }

    public function test_handles_missing_subtitle(): void
    {
        $volumeInfo = ['title' => 'The Way of Kings (Stormlight Archive, #1)'];

        $result = $this->extractSeriesInfo->invoke($this->service, $volumeInfo);

        $this->assertEquals('Stormlight Archive', $result['series_name']);
        $this->assertEquals(1, $result['volume_number']);
    }

    public function test_decimal_volume_numbers_floor_to_integer(): void
    {
        $volumeInfo = ['title' => 'Novella (Series Name, #1.5)'];

        $result = $this->extractSeriesInfo->invoke($this->service, $volumeInfo);

        $this->assertEquals('Series Name', $result['series_name']);
        $this->assertEquals(1, $result['volume_number']);
    }
}
