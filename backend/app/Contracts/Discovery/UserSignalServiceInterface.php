<?php

declare(strict_types=1);

namespace App\Contracts\Discovery;

use App\Models\User;

/**
 * Contract for recording user interaction signals for recommendation improvement.
 *
 * Signals capture user behavior (views, clicks, adds) to feed back into
 * the recommendation algorithm over time.
 */
interface UserSignalServiceInterface
{
    /**
     * Record a batch of user signals.
     *
     * @param  User  $user  The user who generated the signals
     * @param  array<array{book_id: int, type: string}>  $signals  Array of signals
     */
    public function recordSignals(User $user, array $signals): void;

    /**
     * Get the weight multipliers for each signal type.
     *
     * @return array<string, float>  Map of signal type to weight
     */
    public function getSignalWeights(): array;

    /**
     * Clean up old signals beyond the retention period.
     *
     * @return int  Number of signals deleted
     */
    public function pruneOldSignals(): int;

    /**
     * Get signal statistics for a user.
     *
     * @return array{total: int, by_type: array<string, int>}
     */
    public function getUserSignalStats(User $user): array;

    /**
     * Get IDs of books the user has dismissed.
     *
     * @return array<int>  Array of catalog_book_ids
     */
    public function getDismissedBookIds(User $user): array;

    /**
     * Get weighted signal scores for books with recency decay.
     *
     * @return array<int, float>  Map of catalog_book_id => weighted_score
     */
    public function getWeightedSignalScores(User $user, int $limit = 100): array;
}
