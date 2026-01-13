<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'defaultFormat' => ['sometimes', 'string', Rule::in(['ebook', 'physical', 'audiobook'])],
            'defaultPrivate' => ['sometimes', 'boolean'],
            'spoilerShield' => ['sometimes', 'boolean'],
            'showReadingStreak' => ['sometimes', 'boolean'],
            'currency' => ['sometimes', 'string', Rule::in(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL'])],
        ];
    }
}
