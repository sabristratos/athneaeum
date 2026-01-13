<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Ingestion;

use App\Services\Ingestion\Cleaners\DescriptionCleaner;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DescriptionCleanerTest extends TestCase
{
    private DescriptionCleaner $cleaner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cleaner = new DescriptionCleaner;
    }

    public function test_returns_null_for_empty_string(): void
    {
        $this->assertNull($this->cleaner->clean(''));
    }

    public function test_returns_null_for_null(): void
    {
        $this->assertNull($this->cleaner->clean(null));
    }

    public function test_returns_null_for_whitespace_only(): void
    {
        $this->assertNull($this->cleaner->clean('   '));
    }

    public function test_strips_html_tags(): void
    {
        $result = $this->cleaner->clean('<p>A <b>great</b> book about <i>adventure</i>.</p>');

        $this->assertEquals('A great book about adventure.', $result);
    }

    public function test_converts_br_to_newlines(): void
    {
        $result = $this->cleaner->clean('Line one<br>Line two<br/>Line three');

        $this->assertStringContainsString("Line one\nLine two\nLine three", $result);
    }

    public function test_converts_paragraphs_to_double_newlines(): void
    {
        $result = $this->cleaner->clean('<p>Paragraph one</p><p>Paragraph two</p>');

        $this->assertStringContainsString('Paragraph one', $result);
        $this->assertStringContainsString('Paragraph two', $result);
    }

    public function test_converts_list_items(): void
    {
        $result = $this->cleaner->clean('<ul><li>Item one</li><li>Item two</li></ul>');

        $this->assertStringContainsString('- Item one', $result);
        $this->assertStringContainsString('- Item two', $result);
    }

    public function test_decodes_html_entities(): void
    {
        $result = $this->cleaner->clean('It&apos;s a &quot;great&quot; book &amp; more');

        $this->assertEquals('It\'s a "great" book & more', $result);
    }

    public function test_normalizes_whitespace(): void
    {
        $result = $this->cleaner->clean('Multiple   spaces    here');

        $this->assertEquals('Multiple spaces here', $result);
    }

    public function test_collapses_multiple_newlines(): void
    {
        $result = $this->cleaner->clean("Line one\n\n\n\nLine two");

        $this->assertStringContainsString('Line one', $result);
        $this->assertStringContainsString('Line two', $result);
        $this->assertStringNotContainsString("\n\n\n", $result);
    }

    public function test_trims_leading_trailing_whitespace(): void
    {
        $result = $this->cleaner->clean('   Description here   ');

        $this->assertEquals('Description here', $result);
    }

    public function test_truncates_very_long_descriptions(): void
    {
        $longText = str_repeat('A', 15000);
        $result = $this->cleaner->clean($longText);

        $this->assertLessThanOrEqual(10003, strlen($result));
        $this->assertStringEndsWith('...', $result);
    }

    #[DataProvider('truncationIndicatorProvider')]
    public function test_detects_truncated_descriptions(string $description, bool $expectedTruncated): void
    {
        $result = $this->cleaner->isTruncated($description);

        $this->assertEquals($expectedTruncated, $result);
    }

    public static function truncationIndicatorProvider(): array
    {
        return [
            'ends with ellipsis' => ['This is truncated...', true],
            'ends with unicode ellipsis' => ['This is truncated…', true],
            'ends with bracketed ellipsis' => ['This is truncated [...]', true],
            'ends with more indicator' => ['This is truncated (more)', true],
            'complete description' => ['This is a complete description.', false],
            'ellipsis in middle' => ['This... is not truncated.', false],
        ];
    }

    public function test_extract_summary_returns_short_description(): void
    {
        $short = 'A short description.';
        $result = $this->cleaner->extractSummary($short);

        $this->assertEquals($short, $result);
    }

    public function test_extract_summary_truncates_long_description(): void
    {
        $long = str_repeat('Word ', 100);
        $result = $this->cleaner->extractSummary($long, 100);

        $this->assertLessThanOrEqual(103, strlen($result));
        $this->assertStringEndsWith('...', $result);
    }

    public function test_extract_summary_breaks_at_word_boundary(): void
    {
        $text = 'This is a test description that should be truncated at a word boundary';
        $result = $this->cleaner->extractSummary($text, 30);

        $this->assertStringNotContainsString('bounda', $result);
    }

    public function test_handles_complex_html(): void
    {
        $html = '<div class="description"><p><strong>Award-winning</strong> novel about <em>love</em> and <a href="#">adventure</a>.</p></div>';
        $result = $this->cleaner->clean($html);

        $this->assertEquals('Award-winning novel about love and adventure.', $result);
    }
}
