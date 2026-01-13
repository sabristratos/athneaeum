<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\GoalPeriodEnum;
use App\Enums\GoalTypeEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Reading goal model for tracking user reading targets.
 *
 * Note: Goal progress is computed on the frontend from local WatermelonDB data.
 * The backend only stores goal targets and metadata.
 */
class ReadingGoal extends Model
{
    protected function casts(): array
    {
        return [
            'type' => GoalTypeEnum::class,
            'period' => GoalPeriodEnum::class,
            'target' => 'integer',
            'year' => 'integer',
            'month' => 'integer',
            'week' => 'integer',
            'is_active' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns this goal.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to get active goals.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get goals for current year.
     */
    public function scopeCurrentYear($query)
    {
        return $query->where('year', now()->year);
    }

    /**
     * Scope to get goals for current month.
     */
    public function scopeCurrentMonth($query)
    {
        return $query->where('year', now()->year)
            ->where('month', now()->month);
    }

    /**
     * Scope to get yearly goals.
     */
    public function scopeYearly($query)
    {
        return $query->where('period', GoalPeriodEnum::Yearly);
    }

    /**
     * Scope to get monthly goals.
     */
    public function scopeMonthly($query)
    {
        return $query->where('period', GoalPeriodEnum::Monthly);
    }
}
