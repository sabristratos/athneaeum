<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Monthly archive of user reading statistics.
 *
 * Stores historical data for month-over-month comparisons
 * and year-in-review features.
 */
class UserStatisticsMonthly extends Model
{
    protected $table = 'user_statistics_monthly';

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'month' => 'integer',

            'books_started' => 'integer',
            'books_read' => 'integer',
            'books_dnf' => 'integer',
            'pages_read' => 'integer',
            'reading_seconds' => 'integer',
            'sessions_count' => 'integer',

            'avg_rating' => 'decimal:2',
            'avg_pages_per_session' => 'decimal:2',
            'avg_pages_per_hour' => 'decimal:2',

            'longest_streak_in_month' => 'integer',
            'active_days' => 'integer',

            'genres' => 'array',
            'formats' => 'array',
            'top_books' => 'array',
            'reading_by_day' => 'array',
        ];
    }

    /**
     * Get the user that owns these statistics.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get reading hours for this month.
     */
    protected function readingHours(): Attribute
    {
        return Attribute::get(function (): float {
            return round($this->reading_seconds / 3600, 1);
        });
    }

    /**
     * Get the month name.
     */
    protected function monthName(): Attribute
    {
        return Attribute::get(function (): string {
            return date('F', mktime(0, 0, 0, $this->month, 1));
        });
    }

    /**
     * Scope to get statistics for a specific year.
     */
    public function scopeForYear($query, int $year)
    {
        return $query->where('year', $year);
    }

    /**
     * Scope to get statistics for a specific month.
     */
    public function scopeForMonth($query, int $year, int $month)
    {
        return $query->where('year', $year)->where('month', $month);
    }

    /**
     * Scope to get recent months.
     */
    public function scopeRecent($query, int $months = 12)
    {
        $startDate = now()->subMonths($months);

        return $query->where(function ($q) use ($startDate) {
            $q->where('year', '>', $startDate->year)
                ->orWhere(function ($q2) use ($startDate) {
                    $q2->where('year', $startDate->year)
                        ->where('month', '>=', $startDate->month);
                });
        })->orderBy('year', 'desc')->orderBy('month', 'desc');
    }
}
