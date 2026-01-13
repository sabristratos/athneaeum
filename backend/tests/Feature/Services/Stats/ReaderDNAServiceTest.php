<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Stats;

use App\Enums\BookFormatEnum;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Models\User;
use App\Models\UserBook;
use App\Services\Stats\ReaderDNAService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for ReaderDNAService.
 *
 * Tests the complete stats calculation pipeline including LLM mood classification,
 * mood ring data, DNF analytics, and seasonal patterns.
 */
class ReaderDNAServiceTest extends TestCase
{
    use RefreshDatabase;

    private ReaderDNAService $service;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(ReaderDNAService::class);
        $this->user = User::factory()->create();
    }

    public function test_get_mood_ring_returns_mood_breakdown(): void
    {
        $adventurousBook = Book::factory()->create([
            'moods' => ['adventurous', 'tense'],
            'is_classified' => true,
        ]);
        $romanticBook = Book::factory()->create([
            'moods' => ['romantic', 'cozy'],
            'is_classified' => true,
        ]);
        $suspenseBook = Book::factory()->create([
            'moods' => ['suspenseful', 'mysterious'],
            'is_classified' => true,
        ]);

        UserBook::factory()->completed()->forUser($this->user)->forBook($adventurousBook)->create();
        UserBook::factory()->completed()->forUser($this->user)->forBook($romanticBook)->create();
        UserBook::factory()->completed()->forUser($this->user)->forBook($suspenseBook)->create();

        $result = $this->service->getMoodRing($this->user);

        $this->assertArrayHasKey('by_moods', $result);
        $this->assertArrayHasKey('by_intensity', $result);
        $this->assertArrayHasKey('by_audience', $result);
        $this->assertArrayHasKey('by_genres', $result);
        $this->assertArrayHasKey('seasonal_patterns', $result);
        $this->assertArrayHasKey('classification_coverage', $result);

        $moodKeys = array_column($result['by_moods'], 'mood_key');

        $this->assertContains('adventurous', $moodKeys);
        $this->assertContains('romantic', $moodKeys);
        $this->assertContains('suspenseful', $moodKeys);
    }

    public function test_get_mood_ring_consolidates_duplicate_moods(): void
    {
        $book1 = Book::factory()->create([
            'moods' => ['adventurous', 'tense'],
            'is_classified' => true,
        ]);
        $book2 = Book::factory()->create([
            'moods' => ['adventurous', 'mysterious'],
            'is_classified' => true,
        ]);

        UserBook::factory()->completed()->forUser($this->user)->forBook($book1)->create();
        UserBook::factory()->completed()->forUser($this->user)->forBook($book2)->create();

        $result = $this->service->getMoodRing($this->user);

        $adventurousMoods = array_filter(
            $result['by_moods'],
            fn ($m) => $m['mood_key'] === 'adventurous'
        );

        $this->assertCount(1, $adventurousMoods);

        $adventurousMood = reset($adventurousMoods);
        $this->assertEquals(2, $adventurousMood['count']);
    }

    public function test_get_mood_ring_returns_intensity_breakdown(): void
    {
        $lightBook = Book::factory()->create([
            'intensity' => 'light',
            'is_classified' => true,
        ]);
        $darkBook = Book::factory()->create([
            'intensity' => 'dark',
            'is_classified' => true,
        ]);

        UserBook::factory()->completed()->forUser($this->user)->forBook($lightBook)->create();
        UserBook::factory()->completed()->forUser($this->user)->forBook($darkBook)->create();

        $result = $this->service->getMoodRing($this->user);

        $this->assertArrayHasKey('by_intensity', $result);
        $this->assertNotEmpty($result['by_intensity']);

        $intensityKeys = array_column($result['by_intensity'], 'intensity_key');
        $this->assertContains('light', $intensityKeys);
        $this->assertContains('dark', $intensityKeys);

        foreach ($result['by_intensity'] as $intensity) {
            $this->assertArrayHasKey('intensity', $intensity);
            $this->assertArrayHasKey('intensity_key', $intensity);
            $this->assertArrayHasKey('description', $intensity);
            $this->assertArrayHasKey('count', $intensity);
            $this->assertArrayHasKey('percentage', $intensity);
        }
    }

    public function test_get_mood_ring_handles_empty_library(): void
    {
        $result = $this->service->getMoodRing($this->user);

        $this->assertArrayHasKey('by_moods', $result);
        $this->assertArrayHasKey('by_genres', $result);
        $this->assertArrayHasKey('by_tags', $result);
        $this->assertArrayHasKey('seasonal_patterns', $result);
        $this->assertArrayHasKey('classification_coverage', $result);
        $this->assertEmpty($result['by_moods']);
        $this->assertEquals(0, $result['classification_coverage']['total']);
    }

    public function test_get_dnf_analytics_normalizes_genre_patterns(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $book = Book::factory()->create([
                'genres' => ['Fiction / Fantasy / Epic'],
                'page_count' => 300,
            ]);
            UserBook::factory()->dnf()->forUser($this->user)->forBook($book)->create();
        }

        for ($i = 0; $i < 3; $i++) {
            $book = Book::factory()->create([
                'genres' => ['Fiction / Fantasy / Epic'],
                'page_count' => 300,
            ]);
            UserBook::factory()->completed()->forUser($this->user)->forBook($book)->create();
        }

        $result = $this->service->getDnfAnalytics($this->user);

        $this->assertArrayHasKey('patterns', $result);

        $genrePatterns = array_filter(
            $result['patterns'],
            fn ($p) => $p['pattern'] === 'genre'
        );

        foreach ($genrePatterns as $pattern) {
            $this->assertArrayHasKey('genre_key', $pattern);
            $this->assertSame('fantasy', $pattern['genre_key']);
        }
    }

    public function test_get_heatmap_data_returns_365_days(): void
    {
        $userBook = UserBook::factory()->reading()->forUser($this->user)->create();

        ReadingSession::factory()->forUserBook($userBook)->today()->withPages(30)->create();
        ReadingSession::factory()->forUserBook($userBook)->yesterday()->withPages(25)->create();
        ReadingSession::factory()->forUserBook($userBook)->daysAgo(7)->withPages(40)->create();

        $result = $this->service->getHeatmapData($this->user);

        $this->assertArrayHasKey('days', $result);
        $this->assertArrayHasKey('total_pages_read', $result);
        $this->assertArrayHasKey('current_streak', $result);
        $this->assertArrayHasKey('longest_streak', $result);
        $this->assertArrayHasKey('reading_rhythm', $result);

        $this->assertCount(365, $result['days']);
        $this->assertGreaterThanOrEqual(95, $result['total_pages_read']);
    }

    public function test_get_format_velocity_calculates_pages_per_hour(): void
    {
        $book = Book::factory()->create(['page_count' => 300]);

        $userBook = UserBook::factory()
            ->forUser($this->user)
            ->forBook($book)
            ->withFormat(BookFormatEnum::Ebook)
            ->completed()
            ->create();

        ReadingSession::factory()
            ->forUserBook($userBook)
            ->withPages(60)
            ->withDuration(3600)
            ->create();

        $result = $this->service->getFormatVelocity($this->user);

        $this->assertArrayHasKey('formats', $result);
        $this->assertArrayHasKey('fastest_format', $result);
        $this->assertArrayHasKey('average_velocity', $result);

        $ebookFormat = collect($result['formats'])->firstWhere('format', 'ebook');
        if ($ebookFormat) {
            $this->assertSame(60.0, $ebookFormat['pages_per_hour']);
        }
    }

    public function test_get_page_economy_calculates_cost_per_hour(): void
    {
        $book = Book::factory()->create(['page_count' => 300]);

        $userBook = UserBook::factory()
            ->forUser($this->user)
            ->forBook($book)
            ->completed()
            ->create(['price' => 15.00]);

        ReadingSession::factory()
            ->forUserBook($userBook)
            ->withPages(300)
            ->withDuration(18000)
            ->create();

        $result = $this->service->getPageEconomy($this->user);

        $this->assertArrayHasKey('total_spent', $result);
        $this->assertArrayHasKey('total_hours', $result);
        $this->assertArrayHasKey('cost_per_hour', $result);
        $this->assertArrayHasKey('comparison', $result);

        $this->assertEquals(15.00, $result['total_spent']);
        $this->assertEquals(5, $result['total_hours']);
        $this->assertEquals(3.00, $result['cost_per_hour']);
    }

    public function test_seasonal_patterns_use_llm_moods(): void
    {
        $winterBook = Book::factory()->create([
            'moods' => ['cozy', 'mysterious'],
            'is_classified' => true,
        ]);
        UserBook::factory()
            ->forUser($this->user)
            ->forBook($winterBook)
            ->completed()
            ->create([
                'finished_at' => now()->setMonth(1),
            ]);

        $summerBook = Book::factory()->create([
            'moods' => ['adventurous', 'romantic'],
            'is_classified' => true,
        ]);
        UserBook::factory()
            ->forUser($this->user)
            ->forBook($summerBook)
            ->completed()
            ->create([
                'finished_at' => now()->setMonth(7),
            ]);

        $result = $this->service->getMoodRing($this->user);

        $this->assertArrayHasKey('seasonal_patterns', $result);

        foreach ($result['seasonal_patterns'] as $pattern) {
            $this->assertArrayHasKey('top_mood', $pattern);
            $this->assertArrayHasKey('top_mood_key', $pattern);

            $this->assertNotEmpty($pattern['top_mood_key']);
        }
    }

    public function test_get_calendar_data_returns_monthly_breakdown(): void
    {
        $userBook = UserBook::factory()->reading()->forUser($this->user)->create();

        for ($day = 1; $day <= 10; $day++) {
            ReadingSession::factory()
                ->forUserBook($userBook)
                ->onDate(now()->startOfMonth()->addDays($day - 1))
                ->withPages(20)
                ->create();
        }

        $result = $this->service->getCalendarData($this->user, now()->year, now()->month);

        $this->assertArrayHasKey('days', $result);
        $this->assertArrayHasKey('monthly_summaries', $result);

        $this->assertNotEmpty($result['days']);
    }
}
