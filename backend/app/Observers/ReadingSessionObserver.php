<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\ReadingSession;
use App\Services\Stats\StatisticsAggregationService;

/**
 * Observer for reading session changes.
 *
 * Automatically updates user statistics when reading sessions are created,
 * updated, or deleted. Goal progress is computed on the frontend.
 */
class ReadingSessionObserver
{
    public function __construct(
        private StatisticsAggregationService $statsService
    ) {}

    /**
     * Handle the ReadingSession "created" event.
     */
    public function created(ReadingSession $session): void
    {
        $this->statsService->incrementSessionStats($session);
    }

    /**
     * Handle the ReadingSession "updated" event.
     */
    public function updated(ReadingSession $session): void
    {
        if ($session->wasChanged(['pages_read', 'duration_seconds', 'date'])) {
            $this->statsService->recalculateAll($session->userBook->user);
        }
    }

    /**
     * Handle the ReadingSession "deleted" event.
     */
    public function deleted(ReadingSession $session): void
    {
        $this->statsService->decrementSessionStats($session);
    }
}
