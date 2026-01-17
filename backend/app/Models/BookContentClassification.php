<?php

declare(strict_types=1);

namespace App\Models;

use App\DTOs\Ingestion\ContentClassificationDTO;
use App\DTOs\Ingestion\DescriptionAssessmentDTO;
use App\DTOs\Ingestion\SeriesExtractionDTO;
use App\DTOs\Ingestion\VibeClassificationDTO;
use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use App\Enums\DescriptionQualityEnum;
use App\Enums\MoodEnum;
use App\Enums\PlotArchetypeEnum;
use App\Enums\ProseStyleEnum;
use App\Enums\SeriesPositionEnum;
use App\Enums\SettingAtmosphereEnum;
use Illuminate\Database\Eloquent\Model;

/**
 * Cache for LLM content classifications.
 *
 * Stores classification results keyed by content hash
 * to avoid repeated API calls for identical content.
 */
class BookContentClassification extends Model
{
    protected function casts(): array
    {
        return [
            'description_quality' => DescriptionQualityEnum::class,
            'description_is_usable' => 'boolean',
            'description_is_promotional' => 'boolean',
            'description_is_truncated' => 'boolean',
            'description_has_spoilers' => 'boolean',
            'description_confidence' => 'float',
            'audience' => AudienceEnum::class,
            'intensity' => ContentIntensityEnum::class,
            'moods' => 'array',
            'content_confidence' => 'float',
            'series_mentioned' => 'boolean',
            'series_position_hint' => SeriesPositionEnum::class,
            'series_volume_hint' => 'integer',
            'series_confidence' => 'float',
            'mood_darkness' => 'float',
            'pacing_speed' => 'float',
            'complexity_score' => 'float',
            'emotional_intensity' => 'float',
            'plot_archetype' => PlotArchetypeEnum::class,
            'prose_style' => ProseStyleEnum::class,
            'setting_atmosphere' => SettingAtmosphereEnum::class,
            'vibe_confidence' => 'float',
            'is_vibe_classified' => 'boolean',
        ];
    }

    /**
     * Generate a content hash for cache lookup.
     */
    public static function generateHash(string $title, ?string $description, ?string $author): string
    {
        $content = strtolower(trim($title));
        $content .= '|'.strtolower(trim($description ?? ''));
        $content .= '|'.strtolower(trim($author ?? ''));

        return hash('sha256', $content);
    }

    /**
     * Find cached classification by content.
     */
    public static function findByContent(string $title, ?string $description, ?string $author): ?self
    {
        $hash = self::generateHash($title, $description, $author);

        return self::where('content_hash', $hash)->first();
    }

    /**
     * Find cached classification by external ID.
     */
    public static function findByExternalId(string $externalId, string $provider): ?self
    {
        return self::where('external_id', $externalId)
            ->where('external_provider', $provider)
            ->first();
    }

    /**
     * Check if all three classification types have been cached.
     */
    public function hasCompleteClassification(): bool
    {
        return $this->description_confidence > 0
            && $this->content_confidence > 0
            && $this->series_confidence > 0;
    }

    /**
     * Check if all four classification types (including vibes) have been cached.
     */
    public function hasCompleteClassificationWithVibes(): bool
    {
        return $this->hasCompleteClassification()
            && $this->vibe_confidence > 0;
    }

    /**
     * Check if vibe classification has been completed.
     */
    public function hasVibeClassification(): bool
    {
        return $this->vibe_confidence > 0 || $this->is_vibe_classified;
    }

    /**
     * Cache description assessment results.
     */
    public static function cacheDescription(
        string $title,
        ?string $description,
        ?string $author,
        ?string $externalId,
        ?string $externalProvider,
        DescriptionAssessmentDTO $assessment
    ): self {
        return self::updateOrCreate(
            ['content_hash' => self::generateHash($title, $description, $author)],
            [
                'external_id' => $externalId,
                'external_provider' => $externalProvider,
                'description_quality' => $assessment->quality,
                'description_is_usable' => $assessment->isUsable,
                'description_is_promotional' => $assessment->isPromotional,
                'description_is_truncated' => $assessment->isTruncated,
                'description_has_spoilers' => $assessment->hasSpoilers,
                'description_confidence' => $assessment->confidence,
            ]
        );
    }

    /**
     * Cache content classification results.
     */
    public static function cacheContent(
        string $title,
        ?string $description,
        ?string $author,
        ?string $externalId,
        ?string $externalProvider,
        ContentClassificationDTO $classification
    ): self {
        return self::updateOrCreate(
            ['content_hash' => self::generateHash($title, $description, $author)],
            [
                'external_id' => $externalId,
                'external_provider' => $externalProvider,
                'audience' => $classification->audience,
                'intensity' => $classification->intensity,
                'moods' => array_map(fn (MoodEnum $m) => $m->value, $classification->moods),
                'content_confidence' => $classification->confidence,
            ]
        );
    }

    /**
     * Cache series extraction results.
     */
    public static function cacheSeries(
        string $title,
        ?string $description,
        ?string $author,
        ?string $externalId,
        ?string $externalProvider,
        SeriesExtractionDTO $extraction
    ): self {
        return self::updateOrCreate(
            ['content_hash' => self::generateHash($title, $description, $author)],
            [
                'external_id' => $externalId,
                'external_provider' => $externalProvider,
                'series_mentioned' => $extraction->seriesMentioned,
                'series_name' => $extraction->seriesName,
                'series_position_hint' => $extraction->positionHint,
                'series_volume_hint' => $extraction->volumeHint,
                'series_confidence' => $extraction->confidence,
            ]
        );
    }

    /**
     * Cache vibe classification results.
     */
    public static function cacheVibes(
        string $title,
        ?string $description,
        ?string $author,
        ?string $externalId,
        ?string $externalProvider,
        VibeClassificationDTO $vibes
    ): self {
        return self::updateOrCreate(
            ['content_hash' => self::generateHash($title, $description, $author)],
            [
                'external_id' => $externalId,
                'external_provider' => $externalProvider,
                'mood_darkness' => $vibes->moodDarkness,
                'pacing_speed' => $vibes->pacingSpeed,
                'complexity_score' => $vibes->complexityScore,
                'emotional_intensity' => $vibes->emotionalIntensity,
                'plot_archetype' => $vibes->plotArchetype,
                'prose_style' => $vibes->proseStyle,
                'setting_atmosphere' => $vibes->settingAtmosphere,
                'vibe_confidence' => $vibes->confidence,
                'is_vibe_classified' => $vibes->confidence > 0,
            ]
        );
    }

    /**
     * Cache all classification results at once.
     */
    public static function cacheAll(
        string $title,
        ?string $description,
        ?string $author,
        ?string $externalId,
        ?string $externalProvider,
        DescriptionAssessmentDTO $descriptionAssessment,
        ContentClassificationDTO $contentClassification,
        SeriesExtractionDTO $seriesExtraction
    ): self {
        return self::updateOrCreate(
            ['content_hash' => self::generateHash($title, $description, $author)],
            [
                'external_id' => $externalId,
                'external_provider' => $externalProvider,
                'description_quality' => $descriptionAssessment->quality,
                'description_is_usable' => $descriptionAssessment->isUsable,
                'description_is_promotional' => $descriptionAssessment->isPromotional,
                'description_is_truncated' => $descriptionAssessment->isTruncated,
                'description_has_spoilers' => $descriptionAssessment->hasSpoilers,
                'description_confidence' => $descriptionAssessment->confidence,
                'audience' => $contentClassification->audience,
                'intensity' => $contentClassification->intensity,
                'moods' => array_map(fn (MoodEnum $m) => $m->value, $contentClassification->moods),
                'content_confidence' => $contentClassification->confidence,
                'series_mentioned' => $seriesExtraction->seriesMentioned,
                'series_name' => $seriesExtraction->seriesName,
                'series_position_hint' => $seriesExtraction->positionHint,
                'series_volume_hint' => $seriesExtraction->volumeHint,
                'series_confidence' => $seriesExtraction->confidence,
            ]
        );
    }

    /**
     * Cache all classification results including vibes at once.
     */
    public static function cacheAllWithVibes(
        string $title,
        ?string $description,
        ?string $author,
        ?string $externalId,
        ?string $externalProvider,
        DescriptionAssessmentDTO $descriptionAssessment,
        ContentClassificationDTO $contentClassification,
        SeriesExtractionDTO $seriesExtraction,
        VibeClassificationDTO $vibeClassification
    ): self {
        return self::updateOrCreate(
            ['content_hash' => self::generateHash($title, $description, $author)],
            [
                'external_id' => $externalId,
                'external_provider' => $externalProvider,
                'description_quality' => $descriptionAssessment->quality,
                'description_is_usable' => $descriptionAssessment->isUsable,
                'description_is_promotional' => $descriptionAssessment->isPromotional,
                'description_is_truncated' => $descriptionAssessment->isTruncated,
                'description_has_spoilers' => $descriptionAssessment->hasSpoilers,
                'description_confidence' => $descriptionAssessment->confidence,
                'audience' => $contentClassification->audience,
                'intensity' => $contentClassification->intensity,
                'moods' => array_map(fn (MoodEnum $m) => $m->value, $contentClassification->moods),
                'content_confidence' => $contentClassification->confidence,
                'series_mentioned' => $seriesExtraction->seriesMentioned,
                'series_name' => $seriesExtraction->seriesName,
                'series_position_hint' => $seriesExtraction->positionHint,
                'series_volume_hint' => $seriesExtraction->volumeHint,
                'series_confidence' => $seriesExtraction->confidence,
                'mood_darkness' => $vibeClassification->moodDarkness,
                'pacing_speed' => $vibeClassification->pacingSpeed,
                'complexity_score' => $vibeClassification->complexityScore,
                'emotional_intensity' => $vibeClassification->emotionalIntensity,
                'plot_archetype' => $vibeClassification->plotArchetype,
                'prose_style' => $vibeClassification->proseStyle,
                'setting_atmosphere' => $vibeClassification->settingAtmosphere,
                'vibe_confidence' => $vibeClassification->confidence,
                'is_vibe_classified' => $vibeClassification->confidence > 0,
            ]
        );
    }

    /**
     * Get description assessment DTO.
     */
    public function getDescriptionAssessment(): DescriptionAssessmentDTO
    {
        return new DescriptionAssessmentDTO(
            quality: $this->description_quality ?? DescriptionQualityEnum::Fair,
            isUsable: $this->description_is_usable,
            isPromotional: $this->description_is_promotional,
            isTruncated: $this->description_is_truncated,
            hasSpoilers: $this->description_has_spoilers,
            confidence: $this->description_confidence,
        );
    }

    /**
     * Get content classification DTO.
     */
    public function getContentClassification(): ContentClassificationDTO
    {
        $moods = [];
        foreach ($this->moods ?? [] as $moodValue) {
            $mood = MoodEnum::tryFrom($moodValue);
            if ($mood !== null) {
                $moods[] = $mood;
            }
        }

        return new ContentClassificationDTO(
            audience: $this->audience,
            intensity: $this->intensity,
            moods: $moods,
            confidence: $this->content_confidence,
        );
    }

    /**
     * Get series extraction DTO.
     */
    public function getSeriesExtraction(): SeriesExtractionDTO
    {
        return new SeriesExtractionDTO(
            seriesMentioned: $this->series_mentioned,
            seriesName: $this->series_name,
            positionHint: $this->series_position_hint,
            volumeHint: $this->series_volume_hint,
            confidence: $this->series_confidence,
        );
    }

    /**
     * Get vibe classification DTO.
     */
    public function getVibeClassification(): VibeClassificationDTO
    {
        return new VibeClassificationDTO(
            moodDarkness: $this->mood_darkness,
            pacingSpeed: $this->pacing_speed,
            complexityScore: $this->complexity_score,
            emotionalIntensity: $this->emotional_intensity,
            plotArchetype: $this->plot_archetype,
            proseStyle: $this->prose_style,
            settingAtmosphere: $this->setting_atmosphere,
            confidence: $this->vibe_confidence ?? 0.0,
        );
    }
}
