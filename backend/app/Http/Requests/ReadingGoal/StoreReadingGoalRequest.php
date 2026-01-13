<?php

declare(strict_types=1);

namespace App\Http\Requests\ReadingGoal;

use App\Enums\GoalPeriodEnum;
use App\Enums\GoalTypeEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReadingGoalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', Rule::enum(GoalTypeEnum::class)],
            'period' => ['required', 'string', Rule::enum(GoalPeriodEnum::class)],
            'target' => ['required', 'integer', 'min:1'],
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'week' => ['nullable', 'integer', 'min:1', 'max:53'],
        ];
    }
}
