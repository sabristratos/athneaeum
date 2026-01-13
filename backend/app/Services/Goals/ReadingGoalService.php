<?php

declare(strict_types=1);

namespace App\Services\Goals;

use App\Enums\BookStatusEnum;
use App\Enums\GoalPeriodEnum;
use App\Enums\GoalTypeEnum;
use App\Models\ReadingGoal;
use App\Models\ReadingSession;
use App\Models\User;
use Illuminate\Support\Carbon;

class ReadingGoalService
{
    /**
     * Update book goals when a book is marked as read.
     */
    public function incrementBookGoals(User $user): void
    {
        $goals = $this->getActiveGoalsForType($user, GoalTypeEnum::Books);

        foreach ($goals as $goal) {
            if ($this->isGoalInCurrentPeriod($goal)) {
                $goal->increment('current_value');
                $this->checkAndMarkCompleted($goal);
            }
        }
    }

    /**
     * Update page goals when pages are read.
     */
    public function addPagesToGoals(User $user, int $pages): void
    {
        if ($pages <= 0) {
            return;
        }

        $goals = $this->getActiveGoalsForType($user, GoalTypeEnum::Pages);

        foreach ($goals as $goal) {
            if ($this->isGoalInCurrentPeriod($goal)) {
                $goal->increment('current_value', $pages);
                $this->checkAndMarkCompleted($goal);
            }
        }
    }

    /**
     * Update minute goals when reading time is logged.
     */
    public function addMinutesToGoals(User $user, int $minutes): void
    {
        if ($minutes <= 0) {
            return;
        }

        $goals = $this->getActiveGoalsForType($user, GoalTypeEnum::Minutes);

        foreach ($goals as $goal) {
            if ($this->isGoalInCurrentPeriod($goal)) {
                $goal->increment('current_value', $minutes);
                $this->checkAndMarkCompleted($goal);
            }
        }
    }

    /**
     * Update reading streak goals.
     */
    public function updateStreakGoals(User $user): void
    {
        $goals = $this->getActiveGoalsForType($user, GoalTypeEnum::Streak);
        $currentStreak = $this->calculateCurrentStreak($user);

        foreach ($goals as $goal) {
            if ($this->isGoalInCurrentPeriod($goal)) {
                if ($currentStreak > $goal->current_value) {
                    $goal->update(['current_value' => $currentStreak]);
                    $this->checkAndMarkCompleted($goal);
                }
            }
        }
    }

    /**
     * Recalculate all goals for a user (useful for corrections).
     */
    public function recalculateAllGoals(User $user): void
    {
        $goals = $user->readingGoals()->active()->get();

        foreach ($goals as $goal) {
            $newValue = $this->calculateGoalValue($user, $goal);
            $goal->update(['current_value' => $newValue]);
            $this->checkAndMarkCompleted($goal);
        }
    }

    /**
     * Calculate the current value for a goal based on actual data.
     */
    public function calculateGoalValue(User $user, ReadingGoal $goal): int
    {
        $startDate = $this->getGoalPeriodStartDate($goal);
        $endDate = $this->getGoalPeriodEndDate($goal);

        return match ($goal->type) {
            GoalTypeEnum::Books => $this->countBooksInPeriod($user, $startDate, $endDate),
            GoalTypeEnum::Pages => $this->countPagesInPeriod($user, $startDate, $endDate),
            GoalTypeEnum::Minutes => $this->countMinutesInPeriod($user, $startDate, $endDate),
            GoalTypeEnum::Streak => $this->calculateCurrentStreak($user),
        };
    }

    /**
     * Get active goals for a specific type.
     */
    private function getActiveGoalsForType(User $user, GoalTypeEnum $type): \Illuminate\Database\Eloquent\Collection
    {
        return $user->readingGoals()
            ->active()
            ->where('type', $type)
            ->get();
    }

    /**
     * Check if a goal is in the current period.
     */
    private function isGoalInCurrentPeriod(ReadingGoal $goal): bool
    {
        $now = now();

        if ($goal->year !== $now->year) {
            return false;
        }

        return match ($goal->period) {
            GoalPeriodEnum::Yearly => true,
            GoalPeriodEnum::Monthly => $goal->month === $now->month,
            GoalPeriodEnum::Weekly => $goal->week === $now->week,
            GoalPeriodEnum::Daily => true,
        };
    }

    /**
     * Get the start date for a goal's period.
     */
    private function getGoalPeriodStartDate(ReadingGoal $goal): Carbon
    {
        return match ($goal->period) {
            GoalPeriodEnum::Yearly => Carbon::create($goal->year, 1, 1)->startOfDay(),
            GoalPeriodEnum::Monthly => Carbon::create($goal->year, $goal->month, 1)->startOfDay(),
            GoalPeriodEnum::Weekly => Carbon::create($goal->year, 1, 1)
                ->addWeeks($goal->week - 1)
                ->startOfWeek()
                ->startOfDay(),
            GoalPeriodEnum::Daily => now()->startOfDay(),
        };
    }

    /**
     * Get the end date for a goal's period.
     */
    private function getGoalPeriodEndDate(ReadingGoal $goal): Carbon
    {
        return match ($goal->period) {
            GoalPeriodEnum::Yearly => Carbon::create($goal->year, 12, 31)->endOfDay(),
            GoalPeriodEnum::Monthly => Carbon::create($goal->year, $goal->month, 1)->endOfMonth()->endOfDay(),
            GoalPeriodEnum::Weekly => Carbon::create($goal->year, 1, 1)
                ->addWeeks($goal->week - 1)
                ->endOfWeek()
                ->endOfDay(),
            GoalPeriodEnum::Daily => now()->endOfDay(),
        };
    }

    /**
     * Count books finished in a period.
     */
    private function countBooksInPeriod(User $user, Carbon $start, Carbon $end): int
    {
        return $user->userBooks()
            ->where('status', BookStatusEnum::Read)
            ->whereBetween('finished_at', [$start, $end])
            ->count();
    }

    /**
     * Count pages read in a period.
     */
    private function countPagesInPeriod(User $user, Carbon $start, Carbon $end): int
    {
        return (int) ReadingSession::whereHas('userBook', fn ($q) => $q->where('user_id', $user->id))
            ->whereBetween('date', [$start, $end])
            ->sum('pages_read');
    }

    /**
     * Count minutes read in a period.
     */
    private function countMinutesInPeriod(User $user, Carbon $start, Carbon $end): int
    {
        $seconds = ReadingSession::whereHas('userBook', fn ($q) => $q->where('user_id', $user->id))
            ->whereBetween('date', [$start, $end])
            ->sum('duration_seconds');

        return (int) floor($seconds / 60);
    }

    /**
     * Calculate the user's current reading streak.
     */
    private function calculateCurrentStreak(User $user): int
    {
        $dates = ReadingSession::whereHas('userBook', fn ($q) => $q->where('user_id', $user->id))
            ->where('date', '>=', now()->subDays(365))
            ->orderBy('date', 'desc')
            ->pluck('date')
            ->map(fn ($date) => Carbon::parse($date)->format('Y-m-d'))
            ->unique()
            ->values();

        if ($dates->isEmpty()) {
            return 0;
        }

        $streak = 0;
        $currentDate = now()->format('Y-m-d');
        $yesterday = now()->subDay()->format('Y-m-d');

        if ($dates->first() !== $currentDate && $dates->first() !== $yesterday) {
            return 0;
        }

        $checkDate = $dates->first() === $currentDate ? now() : now()->subDay();

        foreach ($dates as $date) {
            if ($date === $checkDate->format('Y-m-d')) {
                $streak++;
                $checkDate = $checkDate->subDay();
            } else {
                break;
            }
        }

        return $streak;
    }

    /**
     * Check if goal is completed and mark it.
     */
    private function checkAndMarkCompleted(ReadingGoal $goal): void
    {
        $goal->refresh();

        if ($goal->current_value >= $goal->target && ! $goal->completed_at) {
            $goal->update(['completed_at' => now()]);
        }
    }
}
