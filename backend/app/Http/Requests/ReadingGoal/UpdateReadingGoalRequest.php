<?php

declare(strict_types=1);

namespace App\Http\Requests\ReadingGoal;

use Illuminate\Foundation\Http\FormRequest;

class UpdateReadingGoalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('goal')->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'target' => ['sometimes', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
