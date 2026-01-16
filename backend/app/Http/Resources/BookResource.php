<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Contracts\MediaStorageServiceInterface;
use App\Http\Resources\Concerns\SanitizesUtf8;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    use SanitizesUtf8;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'external_id' => $this->external_id,
            'external_provider' => $this->external_provider,
            'title' => $this->sanitizeUtf8($this->title),
            'author' => $this->sanitizeUtf8($this->author),
            'cover_url' => $this->getCoverUrl(),
            'page_count' => $this->page_count,
            'height_cm' => $this->height_cm !== null ? (float) $this->height_cm : null,
            'width_cm' => $this->width_cm !== null ? (float) $this->width_cm : null,
            'thickness_cm' => $this->thickness_cm !== null ? (float) $this->thickness_cm : null,
            'isbn' => $this->isbn,
            'description' => $this->sanitizeUtf8($this->description),
            'genres' => $this->whenLoaded('genreRelations', function () {
                return $this->genreRelations->map(fn ($g) => [
                    'id' => $g->id,
                    'name' => $g->name,
                    'slug' => $g->slug,
                ]);
            }, $this->genres ?? []),
            'published_date' => $this->published_date?->format('Y-m-d'),
            'series_id' => $this->series_id,
            'volume_number' => $this->volume_number,
            'volume_title' => $this->volume_title,
            'series' => new SeriesResource($this->whenLoaded('series')),
            'audience' => $this->audience?->value,
            'audience_label' => $this->audience?->label(),
            'intensity' => $this->intensity?->value,
            'intensity_label' => $this->intensity?->label(),
            'moods' => $this->moods,
            'is_classified' => $this->is_classified,
            'classification_confidence' => $this->classification_confidence !== null
                ? (float) $this->classification_confidence
                : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function getCoverUrl(): ?string
    {
        $mediaStorage = app(MediaStorageServiceInterface::class);

        return $mediaStorage->getUrl('covers', $this->cover_path, $this->cover_url);
    }
}
