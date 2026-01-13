<?php

declare(strict_types=1);

namespace App\Models;

use App\DTOs\Ingestion\ContentClassificationDTO;
use App\DTOs\Ingestion\DescriptionAssessmentDTO;
use App\DTOs\Ingestion\SeriesExtractionDTO;
use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use App\Enums\DescriptionQualityEnum;
use App\Enums\MoodEnum;
use App\Enums\SeriesPositionEnum;
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
}
