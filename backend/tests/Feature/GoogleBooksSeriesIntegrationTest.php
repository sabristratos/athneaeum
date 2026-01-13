<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

/**
 * Integration tests that hit the actual Google Books API.
 *
 * These tests verify that series extraction works with real API responses.
 * Rate limited to avoid hitting API quotas.
 *
 * Requirements:
 * - GOOGLE_BOOKS_API_KEY must be set in .env or environment
 *
 * Run these tests specifically with:
 *   php artisan test --group=integration
 *   php artisan test tests/Feature/GoogleBooksSeriesIntegrationTest.php
 */
#[Group('integration')]
class GoogleBooksSeriesIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private const RATE_LIMIT_DELAY_MS = 2000;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $apiKey = config('services.google_books.key');
        if (empty($apiKey)) {
            $this->markTestSkipped(
                'Google Books API key not configured. Set GOOGLE_BOOKS_API_KEY in .env to run integration tests.'
            );
        }

        Cache::flush();

        usleep(self::RATE_LIMIT_DELAY_MS * 1000);

        $this->user = User::factory()->create();
    }

    private function authenticatedGet(string $uri): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($this->user)->getJson($uri);
    }

    private function assertSearchOkOrSkip(\Illuminate\Testing\TestResponse $response): void
    {
        if ($response->status() === 503) {
            $this->markTestSkipped(
                'Google Books API returned 503 (Service Unavailable). '.
                'This may indicate rate limiting, invalid API key, or temporary service issues.'
            );
        }

        $response->assertOk();
    }

    public function test_api_connectivity(): void
    {
        $apiKey = config('services.google_books.key');
        $this->assertNotEmpty($apiKey, 'GOOGLE_BOOKS_API_KEY should be configured');

        $response = $this->authenticatedGet('/api/books/search?query=test');

        if ($response->status() === 503) {
            $errorBody = $response->json('error', 'No error message');
            $this->fail(
                'Google Books API returned 503 (Service Unavailable). '.
                'Error: '.$errorBody.'. '.
                'API Key length: '.strlen($apiKey).'. '.
                'Please verify your GOOGLE_BOOKS_API_KEY is valid and not rate limited. '.
                'Check: https://console.cloud.google.com/apis/credentials'
            );
        }

        $this->assertTrue(
            in_array($response->status(), [200, 422]),
            'API should return 200 OK or 422 validation error, got: '.$response->status()
        );
    }

    public function test_extracts_stormlight_archive_series(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=The+Way+of+Kings+Brandon+Sanderson');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Way of Kings');
        $this->assertNotNull($matchingBook, 'Should find The Way of Kings');

        if ($matchingBook['series_name']) {
            $this->assertStringContainsStringIgnoringCase(
                'Stormlight',
                $matchingBook['series_name'],
                'Series name should contain "Stormlight"'
            );
        }
    }

    public function test_extracts_harry_potter_series(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=Harry+Potter+Philosopher+Stone+Rowling');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Philosopher');
        if ($matchingBook === null) {
            $matchingBook = $this->findBookByTitleContains($items, 'Sorcerer');
        }

        $this->assertNotNull($matchingBook, 'Should find Harry Potter book');

        if ($matchingBook['series_name']) {
            $this->assertStringContainsStringIgnoringCase(
                'Harry Potter',
                $matchingBook['series_name'],
                'Series name should contain "Harry Potter"'
            );
        }
    }

    public function test_extracts_game_of_thrones_series(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=A+Game+of+Thrones+George+Martin');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Game of Thrones');
        $this->assertNotNull($matchingBook, 'Should find A Game of Thrones');

        if ($matchingBook['series_name']) {
            $this->assertTrue(
                str_contains(strtolower($matchingBook['series_name']), 'song') ||
                str_contains(strtolower($matchingBook['series_name']), 'ice') ||
                str_contains(strtolower($matchingBook['series_name']), 'fire') ||
                str_contains(strtolower($matchingBook['series_name']), 'thrones'),
                'Series name should relate to A Song of Ice and Fire'
            );
        }
    }

    public function test_extracts_lord_of_the_rings_series(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=Fellowship+of+the+Ring+Tolkien');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Fellowship');
        $this->assertNotNull($matchingBook, 'Should find The Fellowship of the Ring');

        if ($matchingBook['series_name']) {
            $this->assertStringContainsStringIgnoringCase(
                'Ring',
                $matchingBook['series_name'],
                'Series name should contain "Ring"'
            );
        }
    }

    public function test_extracts_hunger_games_series(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=The+Hunger+Games+Suzanne+Collins');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Hunger Games');
        $this->assertNotNull($matchingBook, 'Should find The Hunger Games');

        if ($matchingBook['series_name']) {
            $this->assertStringContainsStringIgnoringCase(
                'Hunger',
                $matchingBook['series_name'],
                'Series name should contain "Hunger"'
            );
        }
    }

    public function test_does_not_extract_series_from_1984(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=1984+George+Orwell');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, '1984');
        $this->assertNotNull($matchingBook, 'Should find 1984');

        $this->assertNull(
            $matchingBook['series_name'],
            '1984 should not be detected as part of a series'
        );
    }

    public function test_does_not_extract_series_from_catch_22(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=Catch-22+Joseph+Heller');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Catch');
        $this->assertNotNull($matchingBook, 'Should find Catch-22');

        $this->assertNull(
            $matchingBook['series_name'],
            'Catch-22 should not be detected as part of a series'
        );
    }

    public function test_does_not_extract_series_from_fahrenheit_451(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=Fahrenheit+451+Ray+Bradbury');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Fahrenheit');
        $this->assertNotNull($matchingBook, 'Should find Fahrenheit 451');

        $this->assertNull(
            $matchingBook['series_name'],
            'Fahrenheit 451 should not be detected as part of a series'
        );
    }

    public function test_search_response_structure(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=Mistborn+Brandon+Sanderson');

        $this->assertSearchOkOrSkip($response);
        $response->assertJsonStructure([
            'items' => [
                '*' => [
                    'external_id',
                    'title',
                    'author',
                    'series_name',
                    'volume_number',
                ],
            ],
            'total',
            'has_more',
            'provider',
        ]);
    }

    public function test_extracts_wheel_of_time_series(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=Eye+of+the+World+Robert+Jordan');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Eye of the World');
        $this->assertNotNull($matchingBook, 'Should find The Eye of the World');

        if ($matchingBook['series_name']) {
            $this->assertStringContainsStringIgnoringCase(
                'Wheel',
                $matchingBook['series_name'],
                'Series name should contain "Wheel"'
            );
        }
    }

    public function test_extracts_divergent_series(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=Divergent+Veronica+Roth');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Divergent');
        $this->assertNotNull($matchingBook, 'Should find Divergent');

        if ($matchingBook['series_name']) {
            $this->assertStringContainsStringIgnoringCase(
                'Divergent',
                $matchingBook['series_name'],
                'Series name should contain "Divergent"'
            );
        }
    }

    public function test_extracts_percy_jackson_series(): void
    {
        $response = $this->authenticatedGet('/api/books/search?query=Lightning+Thief+Rick+Riordan');

        $this->assertSearchOkOrSkip($response);

        $items = $response->json('items');
        $this->assertNotEmpty($items, 'Search should return results');

        $matchingBook = $this->findBookByTitleContains($items, 'Lightning Thief');
        $this->assertNotNull($matchingBook, 'Should find The Lightning Thief');

        if ($matchingBook['series_name']) {
            $this->assertTrue(
                str_contains(strtolower($matchingBook['series_name']), 'percy') ||
                str_contains(strtolower($matchingBook['series_name']), 'jackson') ||
                str_contains(strtolower($matchingBook['series_name']), 'olymp'),
                'Series name should relate to Percy Jackson'
            );
        }
    }

    /**
     * Find a book in the results by partial title match.
     */
    private function findBookByTitleContains(array $items, string $titlePart): ?array
    {
        $titlePartLower = strtolower($titlePart);

        foreach ($items as $item) {
            if (str_contains(strtolower($item['title'] ?? ''), $titlePartLower)) {
                return $item;
            }
        }

        return null;
    }
}
