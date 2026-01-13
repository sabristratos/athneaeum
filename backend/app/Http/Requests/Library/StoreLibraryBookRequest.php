<?php

declare(strict_types=1);

namespace App\Http\Requests\Library;

use App\Enums\BookStatusEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLibraryBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'external_id' => ['nullable', 'string', 'max:255'],
            'external_provider' => ['nullable', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:255'],
            'author' => ['required', 'string', 'max:255'],
            'cover_url' => ['nullable', 'url', 'max:2048'],
            'page_count' => ['nullable', 'integer', 'min:1'],
            'height_cm' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'width_cm' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'thickness_cm' => ['nullable', 'numeric', 'min:0', 'max:50'],
            'isbn' => ['nullable', 'string', 'max:20'],
            'description' => ['nullable', 'string'],
            'genres' => ['nullable', 'array'],
            'genres.*' => ['string', 'max:100'],
            'published_date' => ['nullable', 'date'],
            'status' => ['required', Rule::enum(BookStatusEnum::class)],
        ];
    }
}
