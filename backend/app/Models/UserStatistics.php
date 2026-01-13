<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pre-aggregated statistics for a user's reading activity.
 *
 * This model stores computed metrics that are updated via observers
 * when reading sessions or user books change, avoiding heavy
 * calculations on every stats request.
 */
class UserStatistics extends Model
{
    protected $table = 'user_statistics';

    protected function casts(): array
    {
        return [
            'total_books_read' => 'integer',
            'total_pages_read' => 'integer',
            'total_reading_seconds' => 'integer',
            'total_books_dnf' => 'integer',
            'total_sessions' => 'integer',
            'total_spent' => 'decimal:2',

            'books_read_this_year' => 'integer',
            'books_read_this_month' => 'integer',
            'pages_read_this_year' => 'integer',
            'pages_read_this_month' => 'integer',
            'reading_seconds_this_year' => 'integer',
            'reading_seconds_this_month' => 'integer',

            'current_streak' => 'integer',
            'longest_streak' => 'integer',
            'last_reading_date' => 'date',
            'streak_start_date' => 'date',

            'avg_pages_per_hour' => 'decimal:2',
            'avg_pages_per_session' => 'decimal:2',
            'avg_session_minutes' => 'integer',
            'avg_rating' => 'decimal:2',
            'avg_book_length' => 'decimal:2',

            'reading_by_hour' => 'array',
            'reading_by_day_of_week' => 'array',
            'reading_by_month' => 'array',
            'genres_breakdown' => 'array',
            'formats_breakdown' => 'array',
            'authors_breakdown' => 'array',
            'ratings_distribution' => 'array',
            'completion_by_length' => 'array',

            'consistency_score' => 'integer',
            'diversity_score' => 'integer',

            'reading_profile' => 'array',

            'last_calculated_at' => 'datetime',
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
     * Get total reading hours from seconds.
     */
    protected function totalReadingHours(): Attribute
    {
        return Attribute::get(function (): float {
            return round($this->total_reading_seconds / 3600, 1);
        });
    }

    /**
     * Get reading hours this year.
     */
    protected function readingHoursThisYear(): Attribute
    {
        return Attribute::get(function (): float {
            return round($this->reading_seconds_this_year / 3600, 1);
        });
    }

    /**
     * Get reading hours this month.
     */
    protected function readingHoursThisMonth(): Attribute
    {
        return Attribute::get(function (): float {
            return round($this->reading_seconds_this_month / 3600, 1);
        });
    }

    /**
     * Check if statistics need recalculation (older than 24 hours).
     */
    public function needsRecalculation(): bool
    {
        if (! $this->last_calculated_at) {
            return true;
        }

        return $this->last_calculated_at->diffInHours(now()) > 24;
    }
}
