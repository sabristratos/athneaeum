<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use App\Enums\MoodEnum;
use App\Models\Book;
use App\Models\User;
use App\Services\Ingestion\LLM\LLMConsultant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class BookClassificationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_classification_options_returns_all_options(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/books/classification-options');

        $response->assertOk()
            ->assertJsonStructure([
                'audiences' => [
                    '*' => ['value', 'label'],
                ],
                'intensities' => [
                    '*' => ['value', 'label', 'description'],
                ],
                'moods' => [
                    '*' => ['value', 'label'],
                ],
            ]);

        $data = $response->json();

        $this->assertCount(4, $data['audiences']);
        $this->assertCount(4, $data['intensities']);
        $this->assertCount(10, $data['moods']);

        $audienceValues = array_column($data['audiences'], 'value');
        $this->assertContains('adult', $audienceValues);
        $this->assertContains('young_adult', $audienceValues);
        $this->assertContains('middle_grade', $audienceValues);
        $this->assertContains('children', $audienceValues);

        $intensityValues = array_column($data['intensities'], 'value');
        $this->assertContains('light', $intensityValues);
        $this->assertContains('moderate', $intensityValues);
        $this->assertContains('dark', $intensityValues);
        $this->assertContains('intense', $intensityValues);
    }

    public function test_classify_requires_authentication(): void
    {
        $book = Book::create([
            'title' => 'Test Book',
            'author' => 'Test Author',
            'description' => 'A test description.',
        ]);

        $response = $this->postJson("/api/books/{$book->id}/classify");

        $response->assertUnauthorized();
    }

    public function test_classify_returns_error_when_llm_disabled(): void
    {
        config(['ingestion.llm.enabled' => false]);

        $book = Book::create([
            'title' => 'Test Book',
            'author' => 'Test Author',
            'description' => 'A test description.',
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/books/{$book->id}/classify");

        $response->assertStatus(503)
            ->assertJson(['error' => 'Classification service is not available']);
    }

    public function test_classify_returns_error_when_book_has_no_description(): void
    {
        config(['ingestion.llm.enabled' => true]);

        $mockConsultant = Mockery::mock(LLMConsultant::class);
        $mockConsultant->shouldReceive('isEnabled')->andReturn(true);
        $this->app->instance(LLMConsultant::class, $mockConsultant);

        $book = Book::create([
            'title' => 'Test Book',
            'author' => 'Test Author',
            'description' => null,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/books/{$book->id}/classify");

        $response->assertStatus(422)
            ->assertJson(['error' => 'Book has no description to classify']);
    }

    public function test_classify_updates_book_with_classification(): void
    {
        config(['ingestion.llm.enabled' => true]);

        $book = Book::create([
            'title' => 'The Way of Kings',
            'author' => 'Brandon Sanderson',
            'description' => 'An epic fantasy novel about honor and war.',
            'is_classified' => false,
        ]);

        $mockClassification = new \stdClass();
        $mockClassification->audience = AudienceEnum::Adult;
        $mockClassification->intensity = ContentIntensityEnum::Moderate;
        $mockClassification->moods = [MoodEnum::Adventurous, MoodEnum::Tense];
        $mockClassification->confidence = 0.85;

        $mockConsultant = Mockery::mock(LLMConsultant::class);
        $mockConsultant->shouldReceive('isEnabled')->andReturn(true);
        $mockConsultant->shouldReceive('classifyBook')
            ->once()
            ->andReturn(['content' => $mockClassification]);
        $this->app->instance(LLMConsultant::class, $mockConsultant);

        $response = $this->actingAs($this->user)
            ->postJson("/api/books/{$book->id}/classify");

        $response->assertOk()
            ->assertJsonStructure([
                'id',
                'title',
                'author',
                'audience',
                'audience_label',
                'intensity',
                'intensity_label',
                'moods',
                'is_classified',
            ])
            ->assertJson([
                'audience' => 'adult',
                'audience_label' => 'Adult',
                'intensity' => 'moderate',
                'intensity_label' => 'Moderate',
                'moods' => ['adventurous', 'tense'],
                'is_classified' => true,
            ]);

        $book->refresh();
        $this->assertEquals(AudienceEnum::Adult, $book->audience);
        $this->assertEquals(ContentIntensityEnum::Moderate, $book->intensity);
        $this->assertEquals(['adventurous', 'tense'], $book->moods);
        $this->assertTrue($book->is_classified);
        $this->assertEquals(0.85, $book->classification_confidence);
    }

    public function test_classify_handles_llm_failure(): void
    {
        config(['ingestion.llm.enabled' => true]);

        $book = Book::create([
            'title' => 'Test Book',
            'author' => 'Test Author',
            'description' => 'A test description.',
        ]);

        $mockConsultant = Mockery::mock(LLMConsultant::class);
        $mockConsultant->shouldReceive('isEnabled')->andReturn(true);
        $mockConsultant->shouldReceive('classifyBook')
            ->once()
            ->andThrow(new \Exception('LLM service unavailable'));
        $this->app->instance(LLMConsultant::class, $mockConsultant);

        $response = $this->actingAs($this->user)
            ->postJson("/api/books/{$book->id}/classify");

        $response->assertStatus(500)
            ->assertJsonStructure(['error']);
    }

    public function test_book_resource_includes_classification_fields(): void
    {
        $book = Book::create([
            'title' => 'Classified Book',
            'author' => 'Test Author',
            'description' => 'A classified book.',
            'audience' => AudienceEnum::YoungAdult,
            'intensity' => ContentIntensityEnum::Light,
            'moods' => ['cozy', 'romantic'],
            'is_classified' => true,
            'classification_confidence' => 0.92,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/books/{$book->id}");

        $response->assertOk()
            ->assertJson([
                'audience' => 'young_adult',
                'audience_label' => 'Young Adult',
                'intensity' => 'light',
                'intensity_label' => 'Light',
                'moods' => ['cozy', 'romantic'],
                'is_classified' => true,
            ]);
    }

    public function test_book_resource_handles_null_classification(): void
    {
        $book = Book::create([
            'title' => 'Unclassified Book',
            'author' => 'Test Author',
            'is_classified' => false,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/books/{$book->id}");

        $response->assertOk()
            ->assertJson([
                'audience' => null,
                'audience_label' => null,
                'intensity' => null,
                'intensity_label' => null,
                'moods' => null,
                'is_classified' => false,
            ]);
    }
}
