<?php

declare(strict_types=1);

namespace Tests\Unit\Enums;

use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use App\Enums\MoodEnum;
use Tests\TestCase;

class ClassificationEnumsTest extends TestCase
{
    public function test_audience_enum_has_correct_values(): void
    {
        $this->assertEquals('adult', AudienceEnum::Adult->value);
        $this->assertEquals('young_adult', AudienceEnum::YoungAdult->value);
        $this->assertEquals('middle_grade', AudienceEnum::MiddleGrade->value);
        $this->assertEquals('children', AudienceEnum::Children->value);
    }

    public function test_audience_enum_labels(): void
    {
        $this->assertEquals('Adult', AudienceEnum::Adult->label());
        $this->assertEquals('Young Adult', AudienceEnum::YoungAdult->label());
        $this->assertEquals('Middle Grade', AudienceEnum::MiddleGrade->label());
        $this->assertEquals('Children', AudienceEnum::Children->label());
    }

    public function test_audience_enum_min_age(): void
    {
        $this->assertEquals(18, AudienceEnum::Adult->minAge());
        $this->assertEquals(13, AudienceEnum::YoungAdult->minAge());
        $this->assertEquals(9, AudienceEnum::MiddleGrade->minAge());
        $this->assertEquals(0, AudienceEnum::Children->minAge());
    }

    public function test_audience_enum_max_age(): void
    {
        $this->assertNull(AudienceEnum::Adult->maxAge());
        $this->assertEquals(17, AudienceEnum::YoungAdult->maxAge());
        $this->assertEquals(12, AudienceEnum::MiddleGrade->maxAge());
        $this->assertEquals(8, AudienceEnum::Children->maxAge());
    }

    public function test_audience_enum_options(): void
    {
        $options = AudienceEnum::options();

        $this->assertCount(4, $options);
        $this->assertEquals(['value' => 'adult', 'label' => 'Adult'], $options[0]);
        $this->assertEquals(['value' => 'young_adult', 'label' => 'Young Adult'], $options[1]);
    }

    public function test_intensity_enum_has_correct_values(): void
    {
        $this->assertEquals('light', ContentIntensityEnum::Light->value);
        $this->assertEquals('moderate', ContentIntensityEnum::Moderate->value);
        $this->assertEquals('dark', ContentIntensityEnum::Dark->value);
        $this->assertEquals('intense', ContentIntensityEnum::Intense->value);
    }

    public function test_intensity_enum_labels(): void
    {
        $this->assertEquals('Light', ContentIntensityEnum::Light->label());
        $this->assertEquals('Moderate', ContentIntensityEnum::Moderate->label());
        $this->assertEquals('Dark', ContentIntensityEnum::Dark->label());
        $this->assertEquals('Intense', ContentIntensityEnum::Intense->label());
    }

    public function test_intensity_enum_descriptions(): void
    {
        $this->assertStringContainsString('Uplifting', ContentIntensityEnum::Light->description());
        $this->assertStringContainsString('tension', ContentIntensityEnum::Moderate->description());
        $this->assertStringContainsString('Heavy', ContentIntensityEnum::Dark->description());
        $this->assertStringContainsString('Graphic', ContentIntensityEnum::Intense->description());
    }

    public function test_intensity_enum_options_include_description(): void
    {
        $options = ContentIntensityEnum::options();

        $this->assertCount(4, $options);
        $this->assertArrayHasKey('description', $options[0]);
        $this->assertEquals('light', $options[0]['value']);
        $this->assertEquals('Light', $options[0]['label']);
    }

    public function test_mood_enum_has_correct_values(): void
    {
        $this->assertEquals('adventurous', MoodEnum::Adventurous->value);
        $this->assertEquals('romantic', MoodEnum::Romantic->value);
        $this->assertEquals('suspenseful', MoodEnum::Suspenseful->value);
        $this->assertEquals('humorous', MoodEnum::Humorous->value);
        $this->assertEquals('melancholic', MoodEnum::Melancholic->value);
        $this->assertEquals('inspirational', MoodEnum::Inspirational->value);
        $this->assertEquals('mysterious', MoodEnum::Mysterious->value);
        $this->assertEquals('cozy', MoodEnum::Cozy->value);
        $this->assertEquals('tense', MoodEnum::Tense->value);
        $this->assertEquals('thought_provoking', MoodEnum::Thought_Provoking->value);
    }

    public function test_mood_enum_labels(): void
    {
        $this->assertEquals('Adventurous', MoodEnum::Adventurous->label());
        $this->assertEquals('Thought-Provoking', MoodEnum::Thought_Provoking->label());
        $this->assertEquals('Cozy', MoodEnum::Cozy->label());
    }

    public function test_mood_enum_options(): void
    {
        $options = MoodEnum::options();

        $this->assertCount(10, $options);

        $values = array_column($options, 'value');
        $this->assertContains('adventurous', $values);
        $this->assertContains('romantic', $values);
        $this->assertContains('thought_provoking', $values);
    }

    public function test_mood_enum_from_string(): void
    {
        $this->assertEquals(MoodEnum::Adventurous, MoodEnum::fromString('adventurous'));
        $this->assertEquals(MoodEnum::Thought_Provoking, MoodEnum::fromString('thought_provoking'));
        $this->assertEquals(MoodEnum::Thought_Provoking, MoodEnum::fromString('thought-provoking'));
        $this->assertEquals(MoodEnum::Thought_Provoking, MoodEnum::fromString('Thought Provoking'));
        $this->assertEquals(MoodEnum::Cozy, MoodEnum::fromString('COZY'));
        $this->assertNull(MoodEnum::fromString('invalid'));
        $this->assertNull(MoodEnum::fromString(''));
    }

    public function test_mood_enum_from_string_handles_whitespace(): void
    {
        $this->assertEquals(MoodEnum::Cozy, MoodEnum::fromString('  cozy  '));
        $this->assertEquals(MoodEnum::Romantic, MoodEnum::fromString(' romantic'));
    }
}
