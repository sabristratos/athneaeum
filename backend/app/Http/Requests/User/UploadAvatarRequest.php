<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UploadAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'avatar' => ['required', 'image', 'max:5120', 'mimes:jpeg,png,jpg,webp'],
        ];
    }

    public function messages(): array
    {
        return [
            'avatar.max' => 'The avatar image must not exceed 5MB.',
        ];
    }
}
