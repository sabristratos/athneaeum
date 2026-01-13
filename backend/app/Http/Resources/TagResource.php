<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TagResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'color' => $this->color->value,
            'color_label' => $this->color->label(),
            'emoji' => $this->emoji,
            'is_system' => $this->is_system,
            'sort_order' => $this->sort_order,
            'books_count' => $this->whenCounted('userBooks'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
