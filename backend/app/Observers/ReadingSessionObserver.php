<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\ReadingSession;
use App\Services\Goals\ReadingGoalService;
use App\Services\Stats\StatisticsAggregationService;

/**
 * Observer for reading session changes.
 *
 * Automatically updates user statistics and reading goals when reading sessions
 * are created, updated, or deleted.
 */
class ReadingSessionObserver
{
    public function __construct(
        private StatisticsAggregationService $statsService,
        private ReadingGoalService $goalService
    ) {}

    /**
     * Handle the ReadingSession "created" event.
     */
    public function created(ReadingSession $session): void
    {
        $this->statsService->incrementSessionStats($session);

        $user = $session->userBook->user;

        if ($session->pages_read > 0) {
            $this->goalService->addPagesToGoals($user, $session->pages_read);
        }

        if ($session->duration_seconds > 0) {
            $minutes = (int) floor($session->duration_seconds / 60);
            $this->goalService->addMinutesToGoals($user, $minutes);
        }

        $this->goalService->updateStreakGoals($user);
    }

    /**
     * Handle the ReadingSession "updated" event.
     */
    public function updated(ReadingSession $session): void
    {
        if ($session->wasChanged(['pages_read', 'duration_seconds', 'date'])) {
            $this->statsService->recalculateAll($session->userBook->user);
            $this->goalService->recalculateAllGoals($session->userBook->user);
        }
    }

    /**
     * Handle the ReadingSession "deleted" event.
     */
    public function deleted(ReadingSession $session): void
    {
        $this->statsService->decrementSessionStats($session);
        $this->goalService->recalculateAllGoals($session->userBook->user);
    }
}
