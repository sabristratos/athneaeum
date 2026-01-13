<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SanitizesUtf8;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReadingSessionResource extends JsonResource
{
    use SanitizesUtf8;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_book_id' => $this->user_book_id,
            'read_through_id' => $this->read_through_id,
            'date' => $this->date->format('Y-m-d'),
            'pages_read' => $this->pages_read,
            'start_page' => $this->start_page,
            'end_page' => $this->end_page,
            'duration_seconds' => $this->duration_seconds,
            'formatted_duration' => $this->formatted_duration,
            'notes' => $this->sanitizeUtf8($this->notes),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
