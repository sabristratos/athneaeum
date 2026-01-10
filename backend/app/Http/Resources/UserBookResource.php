<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserBookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'book_id' => $this->book_id,
            'book' => new BookResource($this->whenLoaded('book')),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'rating' => $this->rating,
            'current_page' => $this->current_page,
            'progress_percentage' => $this->progress_percentage,
            'is_dnf' => $this->is_dnf,
            'dnf_reason' => $this->dnf_reason,
            'started_at' => $this->started_at?->format('Y-m-d'),
            'finished_at' => $this->finished_at?->format('Y-m-d'),
            'reading_sessions' => ReadingSessionResource::collection($this->whenLoaded('readingSessions')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
