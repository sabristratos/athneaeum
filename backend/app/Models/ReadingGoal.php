<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\GoalPeriodEnum;
use App\Enums\GoalTypeEnum;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Reading goal model for tracking user reading targets.
 */
class ReadingGoal extends Model
{
    protected function casts(): array
    {
        return [
            'type' => GoalTypeEnum::class,
            'period' => GoalPeriodEnum::class,
            'target' => 'integer',
            'current_value' => 'integer',
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
     * Get progress percentage.
     */
    protected function progressPercentage(): Attribute
    {
        return Attribute::get(function (): float {
            if ($this->target <= 0) {
                return 0;
            }

            return min(100, round(($this->current_value / $this->target) * 100, 1));
        });
    }

    /**
     * Check if goal is completed.
     */
    protected function isCompleted(): Attribute
    {
        return Attribute::get(function (): bool {
            return $this->current_value >= $this->target;
        });
    }

    /**
     * Get remaining amount to reach goal.
     */
    protected function remaining(): Attribute
    {
        return Attribute::get(function (): int {
            return max(0, $this->target - $this->current_value);
        });
    }

    /**
     * Check if on track based on elapsed time in period.
     */
    protected function isOnTrack(): Attribute
    {
        return Attribute::get(function (): bool {
            $expectedProgress = $this->getExpectedProgress();

            return $this->current_value >= $expectedProgress;
        });
    }

    /**
     * Get expected progress based on elapsed time.
     */
    public function getExpectedProgress(): float
    {
        $elapsed = $this->getElapsedFraction();

        return $this->target * $elapsed;
    }

    /**
     * Get fraction of period that has elapsed.
     */
    private function getElapsedFraction(): float
    {
        return match ($this->period) {
            GoalPeriodEnum::Daily => 1.0,
            GoalPeriodEnum::Weekly => now()->dayOfWeek / 7,
            GoalPeriodEnum::Monthly => now()->day / now()->daysInMonth,
            GoalPeriodEnum::Yearly => now()->dayOfYear / (now()->isLeapYear() ? 366 : 365),
        };
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
