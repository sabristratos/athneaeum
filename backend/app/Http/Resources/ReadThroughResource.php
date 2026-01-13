<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SanitizesUtf8;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReadThroughResource extends JsonResource
{
    use SanitizesUtf8;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_book_id' => $this->user_book_id,
            'read_number' => $this->read_number,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'review' => $this->sanitizeUtf8($this->review),
            'is_dnf' => $this->is_dnf,
            'dnf_reason' => $this->sanitizeUtf8($this->dnf_reason),
            'started_at' => $this->started_at?->format('Y-m-d'),
            'finished_at' => $this->finished_at?->format('Y-m-d'),
            'total_pages_read' => $this->when(
                $this->relationLoaded('readingSessions'),
                fn () => $this->total_pages_read
            ),
            'total_reading_seconds' => $this->when(
                $this->relationLoaded('readingSessions'),
                fn () => $this->total_reading_seconds
            ),
            'reading_sessions' => ReadingSessionResource::collection($this->whenLoaded('readingSessions')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
