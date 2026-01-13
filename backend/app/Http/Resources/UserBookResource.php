<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SanitizesUtf8;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserBookResource extends JsonResource
{
    use SanitizesUtf8;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'book_id' => $this->book_id,
            'book' => new BookResource($this->whenLoaded('book')),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'format' => $this->format?->value,
            'format_label' => $this->format?->label(),
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'price' => $this->price !== null ? (float) $this->price : null,
            'current_page' => $this->current_page,
            'progress_percentage' => $this->progress_percentage,
            'is_dnf' => $this->is_dnf,
            'dnf_reason' => $this->sanitizeUtf8($this->dnf_reason),
            'is_pinned' => $this->is_pinned,
            'queue_position' => $this->queue_position,
            'review' => $this->sanitizeUtf8($this->review),
            'started_at' => $this->started_at?->format('Y-m-d'),
            'finished_at' => $this->finished_at?->format('Y-m-d'),
            'reading_sessions' => ReadingSessionResource::collection($this->whenLoaded('readingSessions')),
            'read_throughs' => ReadThroughResource::collection($this->whenLoaded('readThroughs')),
            'read_count' => $this->when(
                $this->relationLoaded('readThroughs'),
                fn () => $this->read_count
            ),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
