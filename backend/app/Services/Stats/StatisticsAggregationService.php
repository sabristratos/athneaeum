<?php

declare(strict_types=1);

namespace App\Services\Stats;

use App\Enums\BookStatusEnum;
use App\Models\ReadingSession;
use App\Models\User;
use App\Models\UserBook;
use App\Models\UserStatistics;
use App\Models\UserStatisticsMonthly;
use App\Services\Stats\Concerns\NormalizesGenres;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Service for aggregating and updating user reading statistics.
 *
 * This service handles both incremental updates (via observers) and
 * full recalculations of user statistics.
 */
class StatisticsAggregationService
{
    use NormalizesGenres;

    /**
     * Recalculate all statistics for a user from scratch.
     */
    public function recalculateAll(User $user): UserStatistics
    {
        $stats = $this->calculateFromScratch($user);

        return UserStatistics::updateOrCreate(
            ['user_id' => $user->id],
            $stats + ['last_calculated_at' => now()]
        );
    }

    /**
     * Calculate all statistics from raw data.
     */
    private function calculateFromScratch(User $user): array
    {
        $userBooks = UserBook::where('user_id', $user->id)
            ->with(['book', 'readingSessions'])
            ->get();

        $allSessions = ReadingSession::whereIn('user_book_id', $userBooks->pluck('id'))
            ->orderBy('date')
            ->get();

        $completedBooks = $userBooks->where('status', BookStatusEnum::Read);
        $dnfBooks = $userBooks->filter(fn ($ub) => $ub->is_dnf || $ub->status === BookStatusEnum::Dnf);

        $totalPagesFromSessions = $allSessions->sum('pages_read');
        $totalPagesFromBooks = $completedBooks->sum(fn ($ub) => $ub->book?->page_count ?? 0);
        $totalPages = max($totalPagesFromSessions, $totalPagesFromBooks);

        $totalSeconds = $allSessions->sum('duration_seconds');

        $thisYear = now()->year;
        $thisMonth = now()->month;

        $booksThisYear = $completedBooks->filter(fn ($ub) => $ub->finished_at?->year === $thisYear);
        $booksThisMonth = $booksThisYear->filter(fn ($ub) => $ub->finished_at?->month === $thisMonth);

        $sessionsThisYear = $allSessions->filter(fn ($s) => Carbon::parse($s->date)->year === $thisYear);
        $sessionsThisMonth = $sessionsThisYear->filter(fn ($s) => Carbon::parse($s->date)->month === $thisMonth);

        $streaks = $this->calculateStreaks($allSessions);
        $avgPagesPerHour = $totalSeconds > 0
            ? round($totalPagesFromSessions / ($totalSeconds / 3600), 2)
            : null;

        $avgPagesPerSession = $allSessions->count() > 0
            ? round($totalPagesFromSessions / $allSessions->count(), 2)
            : null;

        $avgSessionMinutes = $allSessions->count() > 0
            ? (int) round($totalSeconds / $allSessions->count() / 60)
            : null;

        $ratings = $userBooks->whereNotNull('rating')->pluck('rating');
        $avgRating = $ratings->count() > 0 ? round($ratings->avg(), 2) : null;

        $avgBookLength = $completedBooks->count() > 0
            ? round($completedBooks->avg(fn ($ub) => $ub->book?->page_count ?? 0), 2)
            : null;

        return [
            'total_books_read' => $completedBooks->count(),
            'total_pages_read' => $totalPages,
            'total_reading_seconds' => $totalSeconds,
            'total_books_dnf' => $dnfBooks->count(),
            'total_sessions' => $allSessions->count(),
            'total_spent' => $userBooks->sum('price') ?? 0,

            'books_read_this_year' => $booksThisYear->count(),
            'books_read_this_month' => $booksThisMonth->count(),
            'pages_read_this_year' => $sessionsThisYear->sum('pages_read'),
            'pages_read_this_month' => $sessionsThisMonth->sum('pages_read'),
            'reading_seconds_this_year' => $sessionsThisYear->sum('duration_seconds'),
            'reading_seconds_this_month' => $sessionsThisMonth->sum('duration_seconds'),

            'current_streak' => $streaks['current'],
            'longest_streak' => $streaks['longest'],
            'last_reading_date' => $streaks['last_date'],
            'streak_start_date' => $streaks['streak_start'],

            'avg_pages_per_hour' => $avgPagesPerHour,
            'avg_pages_per_session' => $avgPagesPerSession,
            'avg_session_minutes' => $avgSessionMinutes,
            'avg_rating' => $avgRating,
            'avg_book_length' => $avgBookLength,

            'reading_by_hour' => $this->calculateReadingByHour($allSessions),
            'reading_by_day_of_week' => $this->calculateReadingByDayOfWeek($allSessions),
            'reading_by_month' => $this->calculateReadingByMonth($allSessions),
            'genres_breakdown' => $this->calculateGenresBreakdown($userBooks),
            'formats_breakdown' => $this->calculateFormatsBreakdown($userBooks),
            'authors_breakdown' => $this->calculateAuthorsBreakdown($userBooks),
            'ratings_distribution' => $this->calculateRatingsDistribution($userBooks),
            'completion_by_length' => $this->calculateCompletionByLength($userBooks),

            'consistency_score' => $this->calculateConsistencyScore($allSessions),
            'diversity_score' => $this->calculateDiversityScore($userBooks),
            'reader_type' => $this->determineReaderType($allSessions),
            'reading_pace' => $this->determineReadingPace($avgPagesPerHour),

            'reading_profile' => $this->generateReadingProfile($user, $userBooks, $allSessions),
            'profile_narrative' => $this->generateProfileNarrative($user, $userBooks, $allSessions),
        ];
    }

    /**
     * Increment statistics when a new session is created.
     */
    public function incrementSessionStats(ReadingSession $session): void
    {
        $userId = $session->userBook->user_id;
        $stats = UserStatistics::firstOrCreate(['user_id' => $userId]);

        $isThisYear = Carbon::parse($session->date)->year === now()->year;
        $isThisMonth = $isThisYear && Carbon::parse($session->date)->month === now()->month;

        $updates = [
            'total_pages_read' => DB::raw("total_pages_read + {$session->pages_read}"),
            'total_reading_seconds' => DB::raw('total_reading_seconds + '.($session->duration_seconds ?? 0)),
            'total_sessions' => DB::raw('total_sessions + 1'),
        ];

        if ($isThisYear) {
            $updates['pages_read_this_year'] = DB::raw("pages_read_this_year + {$session->pages_read}");
            $updates['reading_seconds_this_year'] = DB::raw('reading_seconds_this_year + '.($session->duration_seconds ?? 0));
        }

        if ($isThisMonth) {
            $updates['pages_read_this_month'] = DB::raw("pages_read_this_month + {$session->pages_read}");
            $updates['reading_seconds_this_month'] = DB::raw('reading_seconds_this_month + '.($session->duration_seconds ?? 0));
        }

        UserStatistics::where('user_id', $userId)->update($updates);

        $this->updateStreaksForSession($userId, $session->date);
        $this->updateMonthlyStats($userId, Carbon::parse($session->date));
    }

    /**
     * Decrement statistics when a session is deleted.
     */
    public function decrementSessionStats(ReadingSession $session): void
    {
        $userId = $session->userBook->user_id;

        $isThisYear = Carbon::parse($session->date)->year === now()->year;
        $isThisMonth = $isThisYear && Carbon::parse($session->date)->month === now()->month;

        $updates = [
            'total_pages_read' => DB::raw("GREATEST(0, total_pages_read - {$session->pages_read})"),
            'total_reading_seconds' => DB::raw('GREATEST(0, total_reading_seconds - '.($session->duration_seconds ?? 0).')'),
            'total_sessions' => DB::raw('GREATEST(0, total_sessions - 1)'),
        ];

        if ($isThisYear) {
            $updates['pages_read_this_year'] = DB::raw("GREATEST(0, pages_read_this_year - {$session->pages_read})");
            $updates['reading_seconds_this_year'] = DB::raw('GREATEST(0, reading_seconds_this_year - '.($session->duration_seconds ?? 0).')');
        }

        if ($isThisMonth) {
            $updates['pages_read_this_month'] = DB::raw("GREATEST(0, pages_read_this_month - {$session->pages_read})");
            $updates['reading_seconds_this_month'] = DB::raw('GREATEST(0, reading_seconds_this_month - '.($session->duration_seconds ?? 0).')');
        }

        UserStatistics::where('user_id', $userId)->update($updates);
    }

    /**
     * Handle book status changes.
     */
    public function handleStatusChange(UserBook $userBook): void
    {
        $userId = $userBook->user_id;
        $newStatus = $userBook->status;
        $oldStatus = $userBook->getOriginal('status');

        $stats = UserStatistics::firstOrCreate(['user_id' => $userId]);

        if ($newStatus === BookStatusEnum::Read && $oldStatus !== BookStatusEnum::Read) {
            $this->incrementBooksRead($userBook);
        } elseif ($oldStatus === BookStatusEnum::Read && $newStatus !== BookStatusEnum::Read) {
            $this->decrementBooksRead($userBook);
        }

        if ($userBook->is_dnf && ! $userBook->getOriginal('is_dnf')) {
            UserStatistics::where('user_id', $userId)
                ->increment('total_books_dnf');
        } elseif (! $userBook->is_dnf && $userBook->getOriginal('is_dnf')) {
            UserStatistics::where('user_id', $userId)
                ->decrement('total_books_dnf');
        }
    }

    /**
     * Handle rating changes.
     */
    public function updateRatingStats(UserBook $userBook): void
    {
        $userId = $userBook->user_id;

        $avgRating = UserBook::where('user_id', $userId)
            ->whereNotNull('rating')
            ->avg('rating');

        $distribution = UserBook::where('user_id', $userId)
            ->whereNotNull('rating')
            ->selectRaw('CAST(rating AS INTEGER) as star, COUNT(*) as count')
            ->groupBy('star')
            ->pluck('count', 'star')
            ->toArray();

        UserStatistics::where('user_id', $userId)->update([
            'avg_rating' => $avgRating ? round($avgRating, 2) : null,
            'ratings_distribution' => $distribution,
        ]);
    }

    /**
     * Handle price changes.
     */
    public function updateSpendingStats(UserBook $userBook): void
    {
        $userId = $userBook->user_id;

        $totalSpent = UserBook::where('user_id', $userId)
            ->whereNotNull('price')
            ->sum('price');

        UserStatistics::where('user_id', $userId)->update([
            'total_spent' => $totalSpent,
        ]);
    }

    /**
     * Increment books read count.
     */
    private function incrementBooksRead(UserBook $userBook): void
    {
        $userId = $userBook->user_id;
        $finishedAt = $userBook->finished_at ?? now();

        $isThisYear = $finishedAt->year === now()->year;
        $isThisMonth = $isThisYear && $finishedAt->month === now()->month;

        $updates = ['total_books_read' => DB::raw('total_books_read + 1')];

        if ($isThisYear) {
            $updates['books_read_this_year'] = DB::raw('books_read_this_year + 1');
        }

        if ($isThisMonth) {
            $updates['books_read_this_month'] = DB::raw('books_read_this_month + 1');
        }

        UserStatistics::where('user_id', $userId)->update($updates);
    }

    /**
     * Decrement books read count.
     */
    private function decrementBooksRead(UserBook $userBook): void
    {
        $userId = $userBook->user_id;
        $finishedAt = $userBook->getOriginal('finished_at');

        $isThisYear = $finishedAt && Carbon::parse($finishedAt)->year === now()->year;
        $isThisMonth = $isThisYear && Carbon::parse($finishedAt)->month === now()->month;

        $updates = ['total_books_read' => DB::raw('GREATEST(0, total_books_read - 1)')];

        if ($isThisYear) {
            $updates['books_read_this_year'] = DB::raw('GREATEST(0, books_read_this_year - 1)');
        }

        if ($isThisMonth) {
            $updates['books_read_this_month'] = DB::raw('GREATEST(0, books_read_this_month - 1)');
        }

        UserStatistics::where('user_id', $userId)->update($updates);
    }

    /**
     * Update streak calculations for a new session.
     */
    private function updateStreaksForSession(int $userId, $sessionDate): void
    {
        $date = Carbon::parse($sessionDate)->startOfDay();
        $stats = UserStatistics::where('user_id', $userId)->first();

        if (! $stats) {
            return;
        }

        $lastDate = $stats->last_reading_date;

        if (! $lastDate) {
            $stats->update([
                'current_streak' => 1,
                'longest_streak' => max(1, $stats->longest_streak),
                'last_reading_date' => $date,
                'streak_start_date' => $date,
            ]);

            return;
        }

        $daysDiff = $date->diffInDays($lastDate);

        if ($daysDiff === 0) {
            return;
        }

        if ($daysDiff === 1) {
            $newStreak = $stats->current_streak + 1;
            $stats->update([
                'current_streak' => $newStreak,
                'longest_streak' => max($newStreak, $stats->longest_streak),
                'last_reading_date' => $date,
            ]);
        } elseif ($daysDiff > 1) {
            $stats->update([
                'current_streak' => 1,
                'last_reading_date' => $date,
                'streak_start_date' => $date,
            ]);
        }
    }

    /**
     * Update monthly statistics.
     */
    private function updateMonthlyStats(int $userId, Carbon $date): void
    {
        $year = $date->year;
        $month = $date->month;

        UserStatisticsMonthly::updateOrCreate(
            ['user_id' => $userId, 'year' => $year, 'month' => $month],
            []
        )->increment('sessions_count');
    }

    /**
     * Calculate reading streaks from sessions.
     */
    private function calculateStreaks(Collection $sessions): array
    {
        if ($sessions->isEmpty()) {
            return ['current' => 0, 'longest' => 0, 'last_date' => null, 'streak_start' => null];
        }

        $dates = $sessions
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->unique()
            ->sort()
            ->values();

        $longest = 1;
        $streak = 1;

        for ($i = 1; $i < $dates->count(); $i++) {
            $prev = Carbon::parse($dates[$i - 1]);
            $curr = Carbon::parse($dates[$i]);

            if ($curr->diffInDays($prev) === 1) {
                $streak++;
            } else {
                $streak = 1;
            }

            $longest = max($longest, $streak);
        }

        $current = 0;
        $streakStart = null;
        $lastDate = $dates->last();
        $today = Carbon::today()->format('Y-m-d');
        $yesterday = Carbon::yesterday()->format('Y-m-d');

        if ($lastDate === $today || $lastDate === $yesterday) {
            $current = 1;
            $streakStart = $lastDate;

            for ($i = $dates->count() - 2; $i >= 0; $i--) {
                $prev = Carbon::parse($dates[$i]);
                $curr = Carbon::parse($dates[$i + 1]);

                if ($curr->diffInDays($prev) === 1) {
                    $current++;
                    $streakStart = $dates[$i];
                } else {
                    break;
                }
            }
        }

        return [
            'current' => $current,
            'longest' => $longest,
            'last_date' => $lastDate,
            'streak_start' => $streakStart,
        ];
    }

    /**
     * Calculate reading distribution by hour of day.
     */
    private function calculateReadingByHour(Collection $sessions): array
    {
        $byHour = array_fill(0, 24, 0);

        foreach ($sessions as $session) {
            $hour = Carbon::parse($session->created_at)->hour;
            $byHour[$hour] += $session->pages_read;
        }

        return $byHour;
    }

    /**
     * Calculate reading distribution by day of week.
     */
    private function calculateReadingByDayOfWeek(Collection $sessions): array
    {
        $byDay = array_fill(0, 7, 0);

        foreach ($sessions as $session) {
            $day = Carbon::parse($session->date)->dayOfWeek;
            $byDay[$day] += $session->pages_read;
        }

        return $byDay;
    }

    /**
     * Calculate reading distribution by month.
     */
    private function calculateReadingByMonth(Collection $sessions): array
    {
        $byMonth = [];

        foreach ($sessions as $session) {
            $key = Carbon::parse($session->date)->format('Y-m');
            $byMonth[$key] = ($byMonth[$key] ?? 0) + $session->pages_read;
        }

        return $byMonth;
    }

    /**
     * Calculate genre breakdown with normalized genres.
     */
    private function calculateGenresBreakdown(Collection $userBooks): array
    {
        $genres = [];

        foreach ($userBooks as $ub) {
            foreach ($ub->book?->genres ?? [] as $rawGenre) {
                $canonicalGenre = $this->normalizeGenre($rawGenre);
                if ($canonicalGenre === null) {
                    continue;
                }

                if (! isset($genres[$canonicalGenre])) {
                    $genres[$canonicalGenre] = [
                        'genre' => $this->getGenreLabel($canonicalGenre),
                        'genre_key' => $canonicalGenre,
                        'category' => $this->getGenreCategory($canonicalGenre),
                        'count' => 0,
                        'pages' => 0,
                        'ratings' => [],
                    ];
                }
                $genres[$canonicalGenre]['count']++;
                $genres[$canonicalGenre]['pages'] += $ub->book?->page_count ?? 0;

                if ($ub->rating) {
                    $genres[$canonicalGenre]['ratings'][] = $ub->rating;
                }
            }
        }

        foreach ($genres as &$genre) {
            $genre['avg_rating'] = count($genre['ratings']) > 0
                ? round(array_sum($genre['ratings']) / count($genre['ratings']), 2)
                : null;
            unset($genre['ratings']);
        }

        usort($genres, fn ($a, $b) => $b['count'] <=> $a['count']);

        return array_slice($genres, 0, 15);
    }

    /**
     * Calculate format breakdown.
     */
    private function calculateFormatsBreakdown(Collection $userBooks): array
    {
        $formats = [];

        foreach ($userBooks->whereNotNull('format') as $ub) {
            $format = $ub->format->value;

            if (! isset($formats[$format])) {
                $formats[$format] = ['format' => $format, 'count' => 0, 'pages' => 0, 'seconds' => 0];
            }

            $formats[$format]['count']++;
            $formats[$format]['pages'] += $ub->readingSessions->sum('pages_read');
            $formats[$format]['seconds'] += $ub->readingSessions->sum('duration_seconds');
        }

        foreach ($formats as &$format) {
            $hours = $format['seconds'] > 0 ? $format['seconds'] / 3600 : 0;
            $format['pages_per_hour'] = $hours > 0 ? round($format['pages'] / $hours, 1) : 0;
            unset($format['seconds']);
        }

        return array_values($formats);
    }

    /**
     * Calculate author breakdown.
     */
    private function calculateAuthorsBreakdown(Collection $userBooks): array
    {
        $authors = [];

        foreach ($userBooks as $ub) {
            $author = $ub->book?->author;

            if (! $author) {
                continue;
            }

            if (! isset($authors[$author])) {
                $authors[$author] = ['author' => $author, 'count' => 0, 'ratings' => []];
            }

            $authors[$author]['count']++;

            if ($ub->rating) {
                $authors[$author]['ratings'][] = $ub->rating;
            }
        }

        foreach ($authors as &$author) {
            $author['avg_rating'] = count($author['ratings']) > 0
                ? round(array_sum($author['ratings']) / count($author['ratings']), 2)
                : null;
            unset($author['ratings']);
        }

        usort($authors, fn ($a, $b) => $b['count'] <=> $a['count']);

        return array_slice($authors, 0, 10);
    }

    /**
     * Calculate ratings distribution.
     */
    private function calculateRatingsDistribution(Collection $userBooks): array
    {
        $distribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];

        foreach ($userBooks->whereNotNull('rating') as $ub) {
            $star = (int) floor((float) $ub->rating);
            $star = max(1, min(5, $star));
            $distribution[$star]++;
        }

        return $distribution;
    }

    /**
     * Calculate completion rate by book length.
     */
    private function calculateCompletionByLength(Collection $userBooks): array
    {
        $ranges = [
            '0-200' => ['total' => 0, 'completed' => 0, 'dnf' => 0],
            '200-400' => ['total' => 0, 'completed' => 0, 'dnf' => 0],
            '400-600' => ['total' => 0, 'completed' => 0, 'dnf' => 0],
            '600+' => ['total' => 0, 'completed' => 0, 'dnf' => 0],
        ];

        foreach ($userBooks as $ub) {
            $pages = $ub->book?->page_count ?? 0;

            $range = match (true) {
                $pages < 200 => '0-200',
                $pages < 400 => '200-400',
                $pages < 600 => '400-600',
                default => '600+',
            };

            $ranges[$range]['total']++;

            if ($ub->status === BookStatusEnum::Read) {
                $ranges[$range]['completed']++;
            } elseif ($ub->is_dnf || $ub->status === BookStatusEnum::Dnf) {
                $ranges[$range]['dnf']++;
            }
        }

        foreach ($ranges as &$range) {
            $range['completion_rate'] = $range['total'] > 0
                ? round(($range['completed'] / $range['total']) * 100)
                : 0;
        }

        return $ranges;
    }

    /**
     * Calculate consistency score (0-100).
     */
    private function calculateConsistencyScore(Collection $sessions): int
    {
        if ($sessions->isEmpty()) {
            return 0;
        }

        $last90Days = now()->subDays(90);
        $recentSessions = $sessions->filter(fn ($s) => Carbon::parse($s->date)->gte($last90Days));

        $uniqueDays = $recentSessions
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->unique()
            ->count();

        return (int) min(100, round(($uniqueDays / 90) * 100));
    }

    /**
     * Calculate diversity score (0-100) based on normalized genre count.
     */
    private function calculateDiversityScore(Collection $userBooks): int
    {
        $genres = [];

        foreach ($userBooks as $ub) {
            foreach ($ub->book?->genres ?? [] as $rawGenre) {
                $canonicalGenre = $this->normalizeGenre($rawGenre);
                if ($canonicalGenre !== null) {
                    $genres[$canonicalGenre] = ($genres[$canonicalGenre] ?? 0) + 1;
                }
            }
        }

        $uniqueGenres = count($genres);

        return (int) min(100, $uniqueGenres * 10);
    }

    /**
     * Determine reader type based on patterns.
     */
    private function determineReaderType(Collection $sessions): string
    {
        if ($sessions->isEmpty()) {
            return 'new_reader';
        }

        $byDay = $this->calculateReadingByDayOfWeek($sessions);
        $totalPages = array_sum($byDay);

        if ($totalPages === 0) {
            return 'casual';
        }

        $weekendPages = ($byDay[0] ?? 0) + ($byDay[6] ?? 0);
        $weekdayPages = $totalPages - $weekendPages;

        $weekendRatio = $weekendPages / $totalPages;

        if ($weekendRatio >= 0.7) {
            return 'weekend_warrior';
        }

        if ($weekendRatio <= 0.2) {
            return 'weekday_devotee';
        }

        $avgSessionSeconds = $sessions->avg('duration_seconds') ?? 0;

        if ($avgSessionSeconds > 5400) {
            return 'marathon_reader';
        }

        $uniqueDays = $sessions
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->unique()
            ->count();

        $totalDays = max(1, Carbon::parse($sessions->min('date'))->diffInDays(now()) + 1);
        $frequency = $uniqueDays / $totalDays;

        if ($frequency >= 0.8) {
            return 'daily_reader';
        }

        return 'balanced';
    }

    /**
     * Determine reading pace label.
     */
    private function determineReadingPace(?float $pagesPerHour): string
    {
        if (! $pagesPerHour) {
            return 'unknown';
        }

        return match (true) {
            $pagesPerHour >= 80 => 'speed_reader',
            $pagesPerHour >= 50 => 'fast',
            $pagesPerHour >= 30 => 'moderate',
            $pagesPerHour >= 15 => 'leisurely',
            default => 'slow',
        };
    }

    /**
     * Generate structured reading profile for LLM consumption.
     */
    private function generateReadingProfile(User $user, Collection $userBooks, Collection $sessions): array
    {
        $completedBooks = $userBooks->where('status', BookStatusEnum::Read);
        $topGenres = $this->calculateGenresBreakdown($userBooks);
        $topAuthors = $this->calculateAuthorsBreakdown($userBooks);

        return [
            'reader_identity' => [
                'type' => $this->determineReaderType($sessions),
                'consistency' => $this->getConsistencyLabel($this->calculateConsistencyScore($sessions)),
                'pace' => $this->determineReadingPace(
                    $sessions->sum('duration_seconds') > 0
                        ? $sessions->sum('pages_read') / ($sessions->sum('duration_seconds') / 3600)
                        : null
                ),
            ],
            'preferences' => [
                'favorite_genres' => array_slice(array_column($topGenres, 'genre'), 0, 5),
                'favorite_authors' => array_slice(array_column($topAuthors, 'author'), 0, 5),
                'preferred_length' => $this->getPreferredLengthLabel($completedBooks),
                'preferred_format' => $this->getPreferredFormat($userBooks),
            ],
            'patterns' => [
                'reading_days' => $this->getReadingDaysPattern($sessions),
                'seasonal_preference' => $this->getSeasonalPreference($completedBooks),
            ],
            'metrics' => [
                'books_per_year' => $completedBooks->count() > 0
                    ? round($completedBooks->count() / max(1, $this->getReadingYears($userBooks)), 1)
                    : 0,
                'avg_rating' => $userBooks->whereNotNull('rating')->avg('rating'),
                'completion_rate' => $userBooks->count() > 0
                    ? round(($completedBooks->count() / $userBooks->count()) * 100)
                    : 0,
            ],
            'recent_activity' => [
                'last_30_days_books' => $completedBooks
                    ->filter(fn ($ub) => $ub->finished_at && $ub->finished_at->gte(now()->subDays(30)))
                    ->count(),
                'currently_reading' => $userBooks
                    ->where('status', BookStatusEnum::Reading)
                    ->map(fn ($ub) => [
                        'title' => $ub->book?->title,
                        'progress' => $ub->progress_percentage,
                    ])
                    ->values()
                    ->take(3)
                    ->toArray(),
            ],
        ];
    }

    /**
     * Generate natural language profile narrative.
     */
    private function generateProfileNarrative(User $user, Collection $userBooks, Collection $sessions): string
    {
        $completedBooks = $userBooks->where('status', BookStatusEnum::Read);
        $topGenres = array_column($this->calculateGenresBreakdown($userBooks), 'genre');
        $readerType = $this->determineReaderType($sessions);

        $name = $user->name;
        $bookCount = $completedBooks->count();
        $genreList = implode(', ', array_slice($topGenres, 0, 3)) ?: 'various genres';

        $typeDesc = match ($readerType) {
            'weekend_warrior' => 'who reads primarily on weekends',
            'weekday_devotee' => 'who fits reading into weekday routines',
            'daily_reader' => 'with an impressive daily reading habit',
            'marathon_reader' => 'who enjoys long, immersive reading sessions',
            default => 'with balanced reading habits',
        };

        $completionRate = $userBooks->count() > 0
            ? round(($completedBooks->count() / $userBooks->count()) * 100)
            : 0;

        $avgRating = $userBooks->whereNotNull('rating')->avg('rating');
        $ratingStyle = match (true) {
            $avgRating === null => '',
            $avgRating >= 4.5 => ' They rate books generously.',
            $avgRating >= 3.5 => ' They have balanced rating tendencies.',
            default => ' They are a selective critic.',
        };

        return "{$name} has completed {$bookCount} books, {$typeDesc}. ".
               "They gravitate toward {$genreList}. ".
               "Their completion rate is {$completionRate}%.{$ratingStyle}";
    }

    private function getConsistencyLabel(int $score): string
    {
        return match (true) {
            $score >= 80 => 'very_consistent',
            $score >= 50 => 'consistent',
            $score >= 25 => 'casual',
            default => 'sporadic',
        };
    }

    private function getPreferredLengthLabel(Collection $completedBooks): string
    {
        if ($completedBooks->isEmpty()) {
            return 'unknown';
        }

        $avgLength = $completedBooks->avg(fn ($ub) => $ub->book?->page_count ?? 0);

        return match (true) {
            $avgLength >= 500 => 'long (500+ pages)',
            $avgLength >= 300 => 'medium (300-500 pages)',
            $avgLength >= 150 => 'short (150-300 pages)',
            default => 'very short (<150 pages)',
        };
    }

    private function getPreferredFormat(Collection $userBooks): ?string
    {
        $formats = $userBooks->whereNotNull('format')
            ->groupBy(fn ($ub) => $ub->format->value)
            ->map->count();

        return $formats->sortDesc()->keys()->first();
    }

    private function getReadingDaysPattern(Collection $sessions): array
    {
        $byDay = $this->calculateReadingByDayOfWeek($sessions);
        $total = array_sum($byDay);

        if ($total === 0) {
            return ['primary' => 'unknown'];
        }

        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $sorted = $byDay;
        arsort($sorted);

        return [
            'primary' => $dayNames[array_key_first($sorted)],
            'weekend_vs_weekday' => (($byDay[0] + $byDay[6]) / $total) >= 0.5 ? 'weekend' : 'weekday',
        ];
    }

    private function getSeasonalPreference(Collection $completedBooks): ?string
    {
        $bySeason = ['winter' => 0, 'spring' => 0, 'summer' => 0, 'fall' => 0];

        foreach ($completedBooks as $ub) {
            if (! $ub->finished_at) {
                continue;
            }

            $month = $ub->finished_at->month;

            $season = match (true) {
                in_array($month, [12, 1, 2]) => 'winter',
                in_array($month, [3, 4, 5]) => 'spring',
                in_array($month, [6, 7, 8]) => 'summer',
                default => 'fall',
            };

            $bySeason[$season]++;
        }

        arsort($bySeason);

        return array_key_first($bySeason);
    }

    private function getReadingYears(Collection $userBooks): int
    {
        $earliest = $userBooks->min('created_at');

        if (! $earliest) {
            return 1;
        }

        return max(1, Carbon::parse($earliest)->diffInYears(now()));
    }
}
