<?php

declare(strict_types=1);

namespace App\Http\Requests\Library;

use App\Enums\BookFormatEnum;
use App\Enums\BookStatusEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('userBook')->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::enum(BookStatusEnum::class)],
            'format' => ['nullable', Rule::enum(BookFormatEnum::class)],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'current_page' => ['nullable', 'integer', 'min:0'],
            'is_dnf' => ['sometimes', 'boolean'],
            'dnf_reason' => ['nullable', 'string', 'max:1000'],
            'started_at' => ['nullable', 'date'],
            'finished_at' => ['nullable', 'date', 'after_or_equal:started_at'],
        ];
    }
}
