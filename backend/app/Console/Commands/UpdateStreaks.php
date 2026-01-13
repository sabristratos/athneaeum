<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\UserStatistics;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Artisan command to update reading streaks at midnight.
 *
 * Resets current streak to 0 if user hasn't read yesterday or today.
 */
class UpdateStreaks extends Command
{
    protected $signature = 'stats:update-streaks';

    protected $description = 'Update reading streaks for all users (run at midnight)';

    public function handle(): int
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        $updated = UserStatistics::where('current_streak', '>', 0)
            ->where(function ($query) use ($today, $yesterday) {
                $query->whereNull('last_reading_date')
                    ->orWhere(function ($q) use ($today, $yesterday) {
                        $q->where('last_reading_date', '<', $yesterday)
                            ->where('last_reading_date', '!=', $today);
                    });
            })
            ->update(['current_streak' => 0, 'streak_start_date' => null]);

        $this->info("Reset {$updated} broken streaks.");

        return self::SUCCESS;
    }
}
