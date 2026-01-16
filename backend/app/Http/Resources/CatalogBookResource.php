<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API resource for catalog book data.
 *
 * Transforms CatalogBook models into a consistent API format
 * for the discovery feed endpoints.
 */
class CatalogBookResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'author' => $this->author,
            'cover_url' => $this->cover_url,
            'description' => $this->when($request->has('include_description'), $this->description),
            'genres' => $this->genres ?? [],
            'page_count' => $this->page_count,
            'published_date' => $this->published_date?->format('Y-m-d'),
            'average_rating' => $this->average_rating,
            'popularity_score' => round($this->popularity_score, 2),
            'isbn' => $this->isbn,
            'isbn13' => $this->isbn13,
            'external_id' => $this->external_id,
            'external_provider' => $this->external_provider,
            'similarity' => $this->when(isset($this->similarity), fn () => round((float) $this->similarity, 3)),
            'has_embedding' => $this->embedding !== null,

            'audience' => $this->audience,
            'audience_label' => $this->audience ? AudienceEnum::tryFrom($this->audience)?->label() : null,
            'intensity' => $this->intensity,
            'intensity_label' => $this->intensity ? ContentIntensityEnum::tryFrom($this->intensity)?->label() : null,
            'moods' => $this->moods ?? [],
            'is_classified' => $this->is_classified ?? false,
            'classification_confidence' => $this->classification_confidence,

            'recommendation_reason' => $this->when(
                isset($this->recommendation_reason),
                fn () => $this->recommendation_reason
            ),
        ];
    }
}
