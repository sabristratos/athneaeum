<?php

declare(strict_types=1);

namespace App\Http\Requests\Preference;

use App\Enums\PreferenceCategoryEnum;
use App\Enums\PreferenceTypeEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Request for creating a single user preference.
 */
class StorePreferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'category' => ['required', 'string', Rule::enum(PreferenceCategoryEnum::class)],
            'type' => ['required', 'string', Rule::enum(PreferenceTypeEnum::class)],
            'value' => ['required', 'string', 'max:255', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category.required' => __('Category is required.'),
            'category.enum' => __('Invalid category.'),
            'type.required' => __('Type is required.'),
            'type.enum' => __('Invalid type.'),
            'value.required' => __('Value is required.'),
            'value.max' => __('Value must not exceed 255 characters.'),
        ];
    }
}
