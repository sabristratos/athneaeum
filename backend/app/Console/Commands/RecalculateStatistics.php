<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Stats\StatisticsAggregationService;
use Illuminate\Console\Command;

/**
 * Artisan command to recalculate user statistics.
 *
 * Can recalculate for a specific user or all users.
 */
class RecalculateStatistics extends Command
{
    protected $signature = 'stats:recalculate
                            {--user= : Recalculate for a specific user ID}
                            {--all : Recalculate for all users}';

    protected $description = 'Recalculate user reading statistics from scratch';

    public function __construct(
        private StatisticsAggregationService $statsService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $userId = $this->option('user');
        $all = $this->option('all');

        if (! $userId && ! $all) {
            $this->error('Please specify --user=ID or --all');

            return self::FAILURE;
        }

        if ($userId) {
            return $this->recalculateForUser((int) $userId);
        }

        return $this->recalculateForAllUsers();
    }

    private function recalculateForUser(int $userId): int
    {
        $user = User::find($userId);

        if (! $user) {
            $this->error("User with ID {$userId} not found");

            return self::FAILURE;
        }

        $this->info("Recalculating statistics for user: {$user->name}");

        $stats = $this->statsService->recalculateAll($user);

        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Books Read', $stats->total_books_read],
                ['Total Pages Read', $stats->total_pages_read],
                ['Total Reading Hours', round($stats->total_reading_seconds / 3600, 1)],
                ['Current Streak', $stats->current_streak],
                ['Longest Streak', $stats->longest_streak],
                ['Avg Pages/Hour', $stats->avg_pages_per_hour ?? 'N/A'],
                ['Reader Type', $stats->reader_type ?? 'N/A'],
            ]
        );

        $this->info('Statistics recalculated successfully!');

        return self::SUCCESS;
    }

    private function recalculateForAllUsers(): int
    {
        $users = User::all();
        $count = $users->count();

        $this->info("Recalculating statistics for {$count} users...");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($users as $user) {
            $this->statsService->recalculateAll($user);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('All statistics recalculated successfully!');

        return self::SUCCESS;
    }
}
