<?php

declare(strict_types=1);

namespace App\Http\Requests\Preference;

use App\Enums\PreferenceCategoryEnum;
use App\Enums\PreferenceTypeEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Request for batch creating or deleting user preferences.
 */
class BatchPreferenceRequest extends FormRequest
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
            'preferences' => ['required', 'array', 'min:1', 'max:50'],
            'preferences.*.category' => ['required', 'string', Rule::enum(PreferenceCategoryEnum::class)],
            'preferences.*.type' => ['required', 'string', Rule::enum(PreferenceTypeEnum::class)],
            'preferences.*.value' => ['required', 'string', 'max:255', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'preferences.required' => __('At least one preference is required.'),
            'preferences.max' => __('Cannot process more than 50 preferences at once.'),
            'preferences.*.category.required' => __('Category is required for each preference.'),
            'preferences.*.type.required' => __('Type is required for each preference.'),
            'preferences.*.value.required' => __('Value is required for each preference.'),
        ];
    }
}
