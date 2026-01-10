<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Enums\ThemeEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateThemeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'theme' => ['required', 'string', Rule::enum(ThemeEnum::class)],
        ];
    }
}
