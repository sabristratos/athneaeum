<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'external_id' => $this->external_id,
            'external_provider' => $this->external_provider,
            'title' => $this->title,
            'author' => $this->author,
            'cover_url' => $this->cover_url,
            'page_count' => $this->page_count,
            'isbn' => $this->isbn,
            'description' => $this->description,
            'genres' => $this->genres,
            'published_date' => $this->published_date?->format('Y-m-d'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
