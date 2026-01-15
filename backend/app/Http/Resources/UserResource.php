<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'theme' => $this->theme->value,
            'preferences' => $this->preferences,
            'avatar_url' => $this->avatar_path
                ? Storage::disk('public')->url($this->avatar_path)
                : null,
            'has_opds_configured' => $this->hasOpdsConfigured(),
            'preferred_search_source' => $this->preferred_search_source?->value ?? 'google',
            'onboarded_at' => $this->onboarded_at?->toIso8601String(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
