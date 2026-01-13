<?php

declare(strict_types=1);

namespace App\Observers;

use App\Enums\BookStatusEnum;
use App\Models\UserBook;
use App\Services\Stats\StatisticsAggregationService;
use Illuminate\Support\Facades\Cache;

/**
 * Observer for user book changes.
 *
 * Automatically updates user statistics when user books are modified
 * (status changes, ratings, etc.). Goal progress is computed on the frontend.
 */
class UserBookObserver
{
    public function __construct(
        private StatisticsAggregationService $statsService
    ) {}

    /**
     * Handle the UserBook "created" event.
     */
    public function created(UserBook $userBook): void
    {
        $this->invalidateLibraryAuthorsCache($userBook->user_id);
    }

    /**
     * Handle the UserBook "updated" event.
     */
    public function updated(UserBook $userBook): void
    {
        if ($userBook->wasChanged('status') || $userBook->wasChanged('is_dnf')) {
            $this->statsService->handleStatusChange($userBook);

            $oldStatus = $userBook->getOriginal('status');
            $newStatus = $userBook->status;
            if ($newStatus === BookStatusEnum::Read && $oldStatus !== BookStatusEnum::Read) {
                if (! $userBook->finished_at) {
                    $userBook->updateQuietly(['finished_at' => now()]);
                }
            }
        }

        if ($userBook->wasChanged('rating')) {
            $this->statsService->updateRatingStats($userBook);
        }

        if ($userBook->wasChanged('price')) {
            $this->statsService->updateSpendingStats($userBook);
        }
    }

    /**
     * Handle the UserBook "deleted" event.
     */
    public function deleted(UserBook $userBook): void
    {
        $this->statsService->recalculateAll($userBook->user);
        $this->invalidateLibraryAuthorsCache($userBook->user_id);
    }

    /**
     * Invalidate the library authors cache for a user.
     */
    private function invalidateLibraryAuthorsCache(int $userId): void
    {
        Cache::forget("user.{$userId}.library_authors");
    }
}
