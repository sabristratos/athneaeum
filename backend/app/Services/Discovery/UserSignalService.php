<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use App\Contracts\Discovery\UserSignalServiceInterface;
use App\Models\User;
use App\Models\UserSignal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Service for recording and managing user interaction signals.
 *
 * Signals are used to improve recommendations over time by learning
 * from user behavior patterns.
 */
class UserSignalService implements UserSignalServiceInterface
{
    /**
     * Record a batch of user signals.
     *
     * Deduplicates signals by (book_id, type) within the batch,
     * keeping only the most recent signal of each type per book.
     */
    public function recordSignals(User $user, array $signals): void
    {
        if (empty($signals)) {
            return;
        }

        $weights = $this->getSignalWeights();
        $dedupedSignals = $this->deduplicateSignals($signals);
        $inserts = [];

        foreach ($dedupedSignals as $signal) {
            $type = $signal['type'] ?? null;
            $bookId = $signal['book_id'] ?? null;

            if (! $type || ! $bookId) {
                continue;
            }

            if (! isset($weights[$type])) {
                continue;
            }

            $inserts[] = [
                'user_id' => $user->id,
                'catalog_book_id' => $bookId,
                'signal_type' => $type,
                'weight' => $weights[$type],
                'created_at' => now(),
            ];
        }

        if (empty($inserts)) {
            return;
        }

        try {
            DB::table('user_signals')->insert($inserts);

            Log::debug('[UserSignalService] Recorded signals', [
                'user_id' => $user->id,
                'count' => count($inserts),
                'original_count' => count($signals),
            ]);
        } catch (\Exception $e) {
            Log::error('[UserSignalService] Failed to record signals', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Deduplicate signals by (book_id, type), keeping latest timestamp.
     */
    private function deduplicateSignals(array $signals): array
    {
        $unique = [];

        foreach ($signals as $signal) {
            $key = ($signal['book_id'] ?? 0) . ':' . ($signal['type'] ?? '');
            $timestamp = $signal['timestamp'] ?? 0;

            if (! isset($unique[$key]) || $timestamp > ($unique[$key]['timestamp'] ?? 0)) {
                $unique[$key] = $signal;
            }
        }

        return array_values($unique);
    }

    /**
     * Get the weight multipliers for each signal type.
     */
    public function getSignalWeights(): array
    {
        return config('discovery.signals.weights', [
            'view' => 0.1,
            'click' => 0.3,
            'add_to_library' => 1.0,
            'dismiss' => -0.5,
        ]);
    }

    /**
     * Clean up old signals beyond the retention period.
     */
    public function pruneOldSignals(): int
    {
        $retentionDays = config('discovery.signals.retention_days', 90);

        $cutoff = now()->subDays($retentionDays);

        $deleted = UserSignal::where('created_at', '<', $cutoff)->delete();

        if ($deleted > 0) {
            Log::info('[UserSignalService] Pruned old signals', [
                'count' => $deleted,
                'cutoff' => $cutoff->toDateTimeString(),
            ]);
        }

        return $deleted;
    }

    /**
     * Get signal statistics for a user.
     */
    public function getUserSignalStats(User $user): array
    {
        $total = UserSignal::where('user_id', $user->id)->count();

        $byType = UserSignal::where('user_id', $user->id)
            ->selectRaw('signal_type, count(*) as count')
            ->groupBy('signal_type')
            ->pluck('count', 'signal_type')
            ->toArray();

        return [
            'total' => $total,
            'by_type' => $byType,
        ];
    }

    /**
     * Get IDs of books the user has dismissed.
     *
     * Only returns books dismissed within the retention period.
     *
     * @return array<int>  Array of catalog_book_ids
     */
    public function getDismissedBookIds(User $user): array
    {
        $retentionDays = config('discovery.signals.retention_days', 90);

        return UserSignal::where('user_id', $user->id)
            ->where('signal_type', 'dismiss')
            ->where('created_at', '>=', now()->subDays($retentionDays))
            ->distinct()
            ->pluck('catalog_book_id')
            ->toArray();
    }

    /**
     * Get weighted signal scores for books, applying recency decay.
     *
     * Recent signals (within 7 days) get full weight.
     * Older signals decay by 50% each subsequent week.
     *
     * @return array<int, float> Map of catalog_book_id => weighted_score
     */
    public function getWeightedSignalScores(User $user, int $limit = 100): array
    {
        $signals = UserSignal::where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDays(90))
            ->orderByDesc('created_at')
            ->get();

        $scores = [];
        $now = now();

        foreach ($signals as $signal) {
            $bookId = $signal->catalog_book_id;
            $baseWeight = $signal->weight;

            $daysAgo = $now->diffInDays($signal->created_at);
            $weeksAgo = floor($daysAgo / 7);
            $decayFactor = pow(0.5, $weeksAgo);

            $weightedScore = $baseWeight * $decayFactor;

            if (! isset($scores[$bookId])) {
                $scores[$bookId] = 0;
            }
            $scores[$bookId] += $weightedScore;
        }

        arsort($scores);

        return array_slice($scores, 0, $limit, true);
    }

    /**
     * Get books the user has positively interacted with recently.
     *
     * Uses recency-weighted scores to find the most relevant books.
     *
     * @return array<int> Array of catalog_book_ids
     */
    public function getPositiveInteractionBooks(User $user, int $limit = 20): array
    {
        $scores = $this->getWeightedSignalScores($user, $limit * 2);

        $positive = array_filter($scores, fn ($score) => $score > 0);

        return array_slice(array_keys($positive), 0, $limit);
    }

    /**
     * Get recommendation metrics for analytics.
     *
     * Computes CTR (click-through rate), conversion rate, and engagement metrics
     * based on user signal data.
     *
     * @param  int  $days  Number of days to analyze
     */
    public function getRecommendationMetrics(int $days = 30): array
    {
        $since = now()->subDays($days);

        $totals = DB::table('user_signals')
            ->where('created_at', '>=', $since)
            ->selectRaw("
                signal_type,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT catalog_book_id) as unique_books
            ")
            ->groupBy('signal_type')
            ->get()
            ->keyBy('signal_type');

        $views = $totals->get('view')?->count ?? 0;
        $clicks = $totals->get('click')?->count ?? 0;
        $adds = $totals->get('add_to_library')?->count ?? 0;
        $dismisses = $totals->get('dismiss')?->count ?? 0;

        $ctr = $views > 0 ? round(($clicks / $views) * 100, 2) : 0;
        $conversionRate = $clicks > 0 ? round(($adds / $clicks) * 100, 2) : 0;
        $dismissRate = $views > 0 ? round(($dismisses / $views) * 100, 2) : 0;

        $dailyStats = DB::table('user_signals')
            ->where('created_at', '>=', $since)
            ->selectRaw("DATE(created_at) as date, signal_type, COUNT(*) as count")
            ->groupBy('date', 'signal_type')
            ->orderBy('date')
            ->get();

        $dailyMetrics = [];
        foreach ($dailyStats->groupBy('date') as $date => $daySignals) {
            $dayViews = $daySignals->firstWhere('signal_type', 'view')?->count ?? 0;
            $dayClicks = $daySignals->firstWhere('signal_type', 'click')?->count ?? 0;
            $dayAdds = $daySignals->firstWhere('signal_type', 'add_to_library')?->count ?? 0;

            $dailyMetrics[] = [
                'date' => $date,
                'views' => $dayViews,
                'clicks' => $dayClicks,
                'adds' => $dayAdds,
                'ctr' => $dayViews > 0 ? round(($dayClicks / $dayViews) * 100, 2) : 0,
            ];
        }

        return [
            'period_days' => $days,
            'totals' => [
                'views' => $views,
                'clicks' => $clicks,
                'adds_to_library' => $adds,
                'dismisses' => $dismisses,
            ],
            'rates' => [
                'ctr_percent' => $ctr,
                'conversion_percent' => $conversionRate,
                'dismiss_percent' => $dismissRate,
            ],
            'unique_users' => $totals->get('view')?->unique_users ?? 0,
            'unique_books_shown' => $totals->get('view')?->unique_books ?? 0,
            'daily' => $dailyMetrics,
        ];
    }

    /**
     * Get top performing books by conversion rate.
     *
     * @param  int  $days  Number of days to analyze
     * @param  int  $minViews  Minimum views to be included
     */
    public function getTopPerformingBooks(int $days = 30, int $minViews = 10, int $limit = 20): array
    {
        $since = now()->subDays($days);

        return DB::table('user_signals')
            ->where('created_at', '>=', $since)
            ->select('catalog_book_id')
            ->selectRaw("
                SUM(CASE WHEN signal_type = 'view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN signal_type = 'click' THEN 1 ELSE 0 END) as clicks,
                SUM(CASE WHEN signal_type = 'add_to_library' THEN 1 ELSE 0 END) as adds
            ")
            ->groupBy('catalog_book_id')
            ->havingRaw("SUM(CASE WHEN signal_type = 'view' THEN 1 ELSE 0 END) >= ?", [$minViews])
            ->orderByRaw("SUM(CASE WHEN signal_type = 'add_to_library' THEN 1 ELSE 0 END)::float / NULLIF(SUM(CASE WHEN signal_type = 'click' THEN 1 ELSE 0 END), 0) DESC NULLS LAST")
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'catalog_book_id' => $row->catalog_book_id,
                'views' => (int) $row->views,
                'clicks' => (int) $row->clicks,
                'adds' => (int) $row->adds,
                'ctr' => $row->views > 0 ? round(($row->clicks / $row->views) * 100, 2) : 0,
                'conversion' => $row->clicks > 0 ? round(($row->adds / $row->clicks) * 100, 2) : 0,
            ])
            ->toArray();
    }
}
