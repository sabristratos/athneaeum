<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SeriesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'author' => $this->author,
            'external_id' => $this->external_id,
            'external_provider' => $this->external_provider,
            'total_volumes' => $this->total_volumes,
            'is_complete' => $this->is_complete,
            'description' => $this->description,
            'book_count' => $this->when(
                $this->relationLoaded('books'),
                fn () => $this->books->count()
            ),
            'books' => BookResource::collection($this->whenLoaded('books')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
