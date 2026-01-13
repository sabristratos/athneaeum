<?php

declare(strict_types=1);

namespace Tests\Feature\Ingestion;

use App\DTOs\Ingestion\RawBookDTO;
use App\Services\Ingestion\DataSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataSanitizerTest extends TestCase
{
    use RefreshDatabase;

    private DataSanitizer $sanitizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->sanitizer = app(DataSanitizer::class);
    }

    public function test_sanitizes_basic_book_data(): void
    {
        $raw = new RawBookDTO(
            title: 'The Way of Kings',
            author: 'Brandon Sanderson',
            description: 'An epic fantasy novel.',
            genres: ['Fantasy', 'Fiction'],
            isbn: '0765326353',
            pageCount: 1007,
            publishedDate: '2010-08-31',
            publisher: 'Tor Books',
            externalId: 'abc123',
            externalProvider: 'google_books',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertEquals('The Way of Kings', $result->book->title);
        $this->assertCount(1, $result->book->authors);
        $this->assertEquals('Brandon Sanderson', $result->book->authors[0]->name);
        $this->assertEquals('An epic fantasy novel.', $result->book->description);
        $this->assertContains('fantasy', $result->book->rawGenres);
    }

    public function test_extracts_series_from_title(): void
    {
        $raw = new RawBookDTO(
            title: 'The Way of Kings (Stormlight Archive, #1)',
            author: 'Brandon Sanderson',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertEquals('The Way of Kings', $result->book->title);
        $this->assertEquals('Stormlight Archive', $result->book->seriesName);
        $this->assertEquals(1, $result->book->volumeNumber);
    }

    public function test_uses_provided_series_info_over_extracted(): void
    {
        $raw = new RawBookDTO(
            title: 'The Way of Kings',
            author: 'Brandon Sanderson',
            seriesName: 'Stormlight Archive',
            volumeNumber: 1,
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertEquals('Stormlight Archive', $result->book->seriesName);
        $this->assertEquals(1, $result->book->volumeNumber);
    }

    public function test_cleans_html_from_description(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            description: '<p>A <b>bold</b> description with <i>italic</i> text.</p>',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertEquals('A bold description with italic text.', $result->book->description);
    }

    public function test_flips_last_first_author_format(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Tolkien, J.R.R.',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertEquals('J.R.R. Tolkien', $result->book->authors[0]->name);
    }

    public function test_handles_multiple_authors(): void
    {
        $raw = new RawBookDTO(
            title: 'Good Omens',
            author: 'Neil Gaiman and Terry Pratchett',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertCount(2, $result->book->authors);
        $this->assertEquals('Neil Gaiman', $result->book->authors[0]->name);
        $this->assertEquals('Terry Pratchett', $result->book->authors[1]->name);
    }

    public function test_validates_isbn(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            isbn: '0306406152',
            isbn13: '9780306406157',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertEquals('0306406152', $result->book->isbn);
        $this->assertEquals('9780306406157', $result->book->isbn13);
    }

    public function test_adds_warning_for_invalid_isbn(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            isbn: 'invalid-isbn',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertContains('Invalid ISBN provided', $result->warnings);
    }

    public function test_adds_warning_for_truncated_description(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            description: 'This description is truncated...',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertContains('Description appears to be truncated', $result->warnings);
    }

    public function test_parses_various_date_formats(): void
    {
        $formats = [
            '2020' => '2020-01-01',
            '2020-06' => '2020-06-01',
            '2020-06-15' => '2020-06-15',
            '2020/06/15' => '2020-06-15',
        ];

        foreach ($formats as $input => $expected) {
            $raw = new RawBookDTO(
                title: 'Test Book',
                author: 'Test Author',
                publishedDate: (string) $input,
            );

            $result = $this->sanitizer->sanitize($raw);

            $this->assertEquals(
                $expected,
                $result->book->publishedDate->format('Y-m-d'),
                "Failed for date format: {$input}"
            );
        }
    }

    public function test_sanitizes_cover_url(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            coverUrl: 'http://example.com/cover.jpg&edge=curl&zoom=5',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertStringNotContainsString('edge=curl', $result->book->coverUrl);
        $this->assertStringContainsString('zoom=1', $result->book->coverUrl);
    }

    public function test_returns_null_for_invalid_cover_url(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            coverUrl: 'not-a-valid-url',
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertNull($result->book->coverUrl);
    }

    public function test_flags_unknown_genres_for_llm_decision(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            genres: ['Very Obscure Genre XYZ'],
        );

        $result = $this->sanitizer->sanitize($raw, 'test_source');

        $this->assertTrue($result->needsReview);
        $this->assertNotEmpty($result->llmDecisions);
        $this->assertEquals('genre', $result->llmDecisions[0]['type']);
    }

    public function test_preserves_physical_dimensions(): void
    {
        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            heightCm: 23.5,
            widthCm: 15.5,
            thicknessCm: 3.2,
        );

        $result = $this->sanitizer->sanitize($raw);

        $this->assertEquals(23.5, $result->book->heightCm);
        $this->assertEquals(15.5, $result->book->widthCm);
        $this->assertEquals(3.2, $result->book->thicknessCm);
    }

    public function test_sanitize_title_convenience_method(): void
    {
        $result = $this->sanitizer->sanitizeTitle('  Test Title: A Novel  ');

        $this->assertEquals('Test Title', $result);
    }

    public function test_sanitize_description_convenience_method(): void
    {
        $result = $this->sanitizer->sanitizeDescription('<p>Test description</p>');

        $this->assertEquals('Test description', $result);
    }
}
