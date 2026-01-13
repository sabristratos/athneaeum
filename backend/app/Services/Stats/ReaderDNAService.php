<?php

declare(strict_types=1);

namespace App\Services\Stats;

use App\Enums\AudienceEnum;
use App\Enums\BookFormatEnum;
use App\Enums\ContentIntensityEnum;
use App\Enums\MoodEnum;
use App\Models\ReadingSession;
use App\Models\User;
use App\Models\UserBook;
use App\Services\Stats\Concerns\NormalizesGenres;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Service for calculating Reader DNA statistics.
 *
 * Provides comprehensive reading analytics including heatmap data,
 * format velocity comparisons, mood/genre breakdowns, DNF patterns,
 * and page economy calculations.
 */
class ReaderDNAService
{
    use NormalizesGenres;

    /**
     * Get 365-day heatmap data for reading activity visualization.
     */
    public function getHeatmapData(User $user): array
    {
        $endDate = Carbon::today();
        $startDate = $endDate->copy()->subDays(364);

        $userBookIds = UserBook::where('user_id', $user->id)->pluck('id');

        $sessions = ReadingSession::whereIn('user_book_id', $userBookIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->selectRaw('DATE(date) as session_date, SUM(pages_read) as total_pages')
            ->groupByRaw('DATE(date)')
            ->get()
            ->keyBy('session_date');

        $days = [];
        $maxPages = max($sessions->max('total_pages') ?? 0, 1);

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateStr = $date->format('Y-m-d');
            $pagesRead = (int) ($sessions->get($dateStr)?->total_pages ?? 0);

            $days[] = [
                'date' => $dateStr,
                'pages_read' => $pagesRead,
                'intensity' => $this->calculateIntensity($pagesRead, $maxPages),
            ];
        }

        $allSessions = ReadingSession::whereIn('user_book_id', $userBookIds)->get();
        $streaks = $this->calculateStreaks($allSessions);
        $rhythm = $this->detectReadingRhythm($allSessions);

        $totalPagesFromSessions = $allSessions->sum('pages_read');

        $completedBooks = UserBook::where('user_id', $user->id)
            ->where('status', 'read')
            ->with('book')
            ->get();

        $totalPagesFromCompletedBooks = $completedBooks->sum(fn ($ub) => $ub->book?->page_count ?? 0);

        $totalPagesRead = max($totalPagesFromSessions, $totalPagesFromCompletedBooks);

        return [
            'days' => $days,
            'longest_streak' => $streaks['longest'],
            'current_streak' => $streaks['current'],
            'reading_rhythm' => $rhythm['type'],
            'rhythm_label' => $rhythm['label'],
            'total_active_days' => $sessions->count(),
            'total_pages_read' => $totalPagesRead,
            'total_pages_from_sessions' => $totalPagesFromSessions,
            'total_books_completed' => $completedBooks->count(),
        ];
    }

    /**
     * Get reading velocity comparison by book format.
     */
    public function getFormatVelocity(User $user): array
    {
        $userBooks = UserBook::where('user_id', $user->id)
            ->whereNotNull('format')
            ->with('readingSessions')
            ->get();

        $formatStats = [];

        foreach (BookFormatEnum::cases() as $format) {
            $booksWithFormat = $userBooks->where('format', $format);
            $totalPages = 0;
            $totalSeconds = 0;

            foreach ($booksWithFormat as $userBook) {
                $sessions = $userBook->readingSessions;
                $totalPages += $sessions->sum('pages_read');
                $totalSeconds += $sessions->sum('duration_seconds');
            }

            $totalHours = $totalSeconds > 0 ? $totalSeconds / 3600 : 0;
            $pagesPerHour = $totalHours > 0 ? round($totalPages / $totalHours, 1) : 0;

            $formatStats[] = [
                'format' => $format->value,
                'label' => $format->label(),
                'pages_per_hour' => $pagesPerHour,
                'total_pages' => $totalPages,
                'total_hours' => round($totalHours, 1),
            ];
        }

        $formatStats = array_filter($formatStats, fn ($s) => $s['total_pages'] > 0);
        usort($formatStats, fn ($a, $b) => $b['pages_per_hour'] <=> $a['pages_per_hour']);

        $fastestFormat = ! empty($formatStats) ? $formatStats[0]['format'] : null;
        $totalPagesAll = array_sum(array_column($formatStats, 'total_pages'));
        $totalHoursAll = array_sum(array_column($formatStats, 'total_hours'));
        $averageVelocity = $totalHoursAll > 0 ? round($totalPagesAll / $totalHoursAll, 1) : 0;

        return [
            'formats' => array_values($formatStats),
            'fastest_format' => $fastestFormat,
            'average_velocity' => $averageVelocity,
        ];
    }

    /**
     * Get mood, intensity, audience, and genre breakdowns with seasonal patterns.
     *
     * Uses LLM-classified moods as the primary "Taste DNA" indicator.
     */
    public function getMoodRing(User $user): array
    {
        $userBooks = UserBook::where('user_id', $user->id)
            ->whereIn('status', ['read', 'reading'])
            ->with(['tags', 'book.genreRelations'])
            ->get();

        $totalBooks = $userBooks->count();
        if ($totalBooks === 0) {
            return [
                'by_moods' => [],
                'by_intensity' => [],
                'by_audience' => [],
                'by_genres' => [],
                'by_tags' => [],
                'seasonal_patterns' => [],
                'classification_coverage' => [
                    'classified' => 0,
                    'total' => 0,
                    'percentage' => 0,
                ],
            ];
        }

        $byMoods = $this->calculateMoodBreakdown($userBooks, $totalBooks);
        $byIntensity = $this->calculateIntensityBreakdown($userBooks, $totalBooks);
        $byAudience = $this->calculateAudienceBreakdown($userBooks, $totalBooks);
        $byGenres = $this->calculateGenreBreakdown($userBooks, $totalBooks);
        $byTags = $this->calculateTagBreakdown($userBooks, $totalBooks);

        $classifiedCount = $userBooks->filter(fn ($ub) => $ub->book?->is_classified)->count();

        $seasonalPatterns = $this->calculateSeasonalPatterns($userBooks);

        return [
            'by_moods' => $byMoods,
            'by_intensity' => $byIntensity,
            'by_audience' => $byAudience,
            'by_genres' => $byGenres,
            'by_tags' => $byTags,
            'seasonal_patterns' => $seasonalPatterns,
            'classification_coverage' => [
                'classified' => $classifiedCount,
                'total' => $totalBooks,
                'percentage' => round(($classifiedCount / $totalBooks) * 100, 1),
            ],
        ];
    }

    /**
     * Calculate mood breakdown from LLM classifications.
     */
    private function calculateMoodBreakdown(Collection $userBooks, int $totalBooks): array
    {
        $moodCounts = [];

        foreach ($userBooks as $userBook) {
            $moods = $userBook->book?->moods ?? [];
            foreach ($moods as $moodValue) {
                $mood = MoodEnum::tryFrom($moodValue);
                if ($mood === null) {
                    continue;
                }

                $key = $mood->value;
                if (! isset($moodCounts[$key])) {
                    $moodCounts[$key] = [
                        'mood' => $mood->label(),
                        'mood_key' => $key,
                        'count' => 0,
                    ];
                }
                $moodCounts[$key]['count']++;
            }
        }

        return collect($moodCounts)
            ->map(function ($mood) use ($totalBooks) {
                $mood['percentage'] = round(($mood['count'] / $totalBooks) * 100, 1);

                return $mood;
            })
            ->sortByDesc('count')
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * Calculate content intensity breakdown from LLM classifications.
     */
    private function calculateIntensityBreakdown(Collection $userBooks, int $totalBooks): array
    {
        $intensityCounts = [];

        foreach (ContentIntensityEnum::cases() as $intensity) {
            $intensityCounts[$intensity->value] = [
                'intensity' => $intensity->label(),
                'intensity_key' => $intensity->value,
                'description' => $intensity->description(),
                'count' => 0,
            ];
        }

        foreach ($userBooks as $userBook) {
            $intensity = $userBook->book?->intensity;
            if ($intensity instanceof ContentIntensityEnum) {
                $intensityCounts[$intensity->value]['count']++;
            }
        }

        return collect($intensityCounts)
            ->filter(fn ($item) => $item['count'] > 0)
            ->map(function ($item) use ($totalBooks) {
                $item['percentage'] = round(($item['count'] / $totalBooks) * 100, 1);

                return $item;
            })
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    /**
     * Calculate audience breakdown from LLM classifications.
     */
    private function calculateAudienceBreakdown(Collection $userBooks, int $totalBooks): array
    {
        $audienceCounts = [];

        foreach (AudienceEnum::cases() as $audience) {
            $audienceCounts[$audience->value] = [
                'audience' => $audience->label(),
                'audience_key' => $audience->value,
                'count' => 0,
            ];
        }

        foreach ($userBooks as $userBook) {
            $audience = $userBook->book?->audience;
            if ($audience instanceof AudienceEnum) {
                $audienceCounts[$audience->value]['count']++;
            }
        }

        return collect($audienceCounts)
            ->filter(fn ($item) => $item['count'] > 0)
            ->map(function ($item) use ($totalBooks) {
                $item['percentage'] = round(($item['count'] / $totalBooks) * 100, 1);

                return $item;
            })
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    /**
     * Calculate genre breakdown preferring normalized genre relations.
     */
    private function calculateGenreBreakdown(Collection $userBooks, int $totalBooks): array
    {
        $genreCounts = [];

        foreach ($userBooks as $userBook) {
            $genreRelations = $userBook->book?->genreRelations ?? collect();

            if ($genreRelations->isNotEmpty()) {
                foreach ($genreRelations as $genre) {
                    $key = $genre->slug;
                    if (! isset($genreCounts[$key])) {
                        $genreCounts[$key] = [
                            'genre' => $genre->name,
                            'genre_key' => $key,
                            'count' => 0,
                        ];
                    }
                    $genreCounts[$key]['count']++;
                }
            } else {
                $rawGenres = $userBook->book?->genres ?? [];
                foreach ($rawGenres as $rawGenre) {
                    $canonicalGenre = $this->normalizeGenre($rawGenre);
                    if ($canonicalGenre === null) {
                        continue;
                    }

                    if (! isset($genreCounts[$canonicalGenre])) {
                        $genreCounts[$canonicalGenre] = [
                            'genre' => $this->getGenreLabel($canonicalGenre),
                            'genre_key' => $canonicalGenre,
                            'count' => 0,
                        ];
                    }
                    $genreCounts[$canonicalGenre]['count']++;
                }
            }
        }

        return collect($genreCounts)
            ->map(function ($genre) use ($totalBooks) {
                $genre['percentage'] = round(($genre['count'] / $totalBooks) * 100, 1);

                return $genre;
            })
            ->sortByDesc('count')
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * Calculate tag breakdown from user-created tags.
     */
    private function calculateTagBreakdown(Collection $userBooks, int $totalBooks): array
    {
        $tagCounts = [];

        foreach ($userBooks as $userBook) {
            foreach ($userBook->tags as $tag) {
                $tagId = $tag->id;
                if (! isset($tagCounts[$tagId])) {
                    $tagCounts[$tagId] = [
                        'tag_id' => $tagId,
                        'name' => $tag->name,
                        'color' => $tag->color->value ?? 'primary',
                        'count' => 0,
                    ];
                }
                $tagCounts[$tagId]['count']++;
            }
        }

        return collect($tagCounts)
            ->map(function ($tag) use ($totalBooks) {
                $tag['percentage'] = round(($tag['count'] / $totalBooks) * 100, 1);

                return $tag;
            })
            ->sortByDesc('count')
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * Get DNF (Did Not Finish) analytics and abandonment patterns.
     */
    public function getDnfAnalytics(User $user): array
    {
        $allBooks = UserBook::where('user_id', $user->id)
            ->with('book')
            ->get();

        $dnfBooks = $allBooks->filter(fn ($ub) => $ub->is_dnf || $ub->status->value === 'dnf');

        $totalBooks = $allBooks->count();
        $totalDnf = $dnfBooks->count();
        $dnfRate = $totalBooks > 0 ? round(($totalDnf / $totalBooks) * 100, 1) : 0;

        $patterns = $this->detectDnfPatterns($dnfBooks, $allBooks);
        $abandonmentPoints = $this->calculateAbandonmentPoints($dnfBooks);
        $topReasons = $this->aggregateDnfReasons($dnfBooks);

        return [
            'total_dnf' => $totalDnf,
            'total_books' => $totalBooks,
            'dnf_rate' => $dnfRate,
            'patterns' => $patterns,
            'abandonment_points' => $abandonmentPoints,
            'top_dnf_reasons' => $topReasons,
        ];
    }

    /**
     * Get page economy analysis (cost per hour of entertainment).
     *
     * For books without logged sessions, estimates time based on page count
     * using an average reading speed of 60 pages per hour.
     */
    public function getPageEconomy(User $user): array
    {
        $userBooks = UserBook::where('user_id', $user->id)
            ->whereNotNull('price')
            ->where('price', '>', 0)
            ->with(['book', 'readingSessions'])
            ->get();

        $totalSpent = $userBooks->sum('price');
        $totalTrackedHours = 0;
        $totalEstimatedHours = 0;
        $booksWithTrackedTime = 0;
        $booksWithEstimatedTime = 0;

        $averagePagesPerHour = 60;

        foreach ($userBooks as $userBook) {
            $sessionSeconds = $userBook->readingSessions->sum('duration_seconds');

            if ($sessionSeconds > 0) {
                $totalTrackedHours += $sessionSeconds / 3600;
                $booksWithTrackedTime++;
            } elseif ($userBook->status->value === 'read' && $userBook->book?->page_count > 0) {
                $estimatedHours = $userBook->book->page_count / $averagePagesPerHour;
                $totalEstimatedHours += $estimatedHours;
                $booksWithEstimatedTime++;
            }
        }

        $totalHours = $totalTrackedHours + $totalEstimatedHours;
        $costPerHour = $totalHours > 0 ? round($totalSpent / $totalHours, 2) : 0;

        $bestValueBooks = $userBooks
            ->map(function ($userBook) use ($averagePagesPerHour) {
                $sessionHours = $userBook->readingSessions->sum('duration_seconds') / 3600;

                if ($sessionHours > 0) {
                    $hours = $sessionHours;
                    $isEstimated = false;
                } elseif ($userBook->status->value === 'read' && $userBook->book?->page_count > 0) {
                    $hours = $userBook->book->page_count / $averagePagesPerHour;
                    $isEstimated = true;
                } else {
                    return null;
                }

                return [
                    'title' => $userBook->book?->title ?? 'Unknown',
                    'cost_per_hour' => round($userBook->price / $hours, 2),
                    'price' => (float) $userBook->price,
                    'hours' => round($hours, 1),
                    'is_estimated' => $isEstimated,
                ];
            })
            ->filter()
            ->sortBy('cost_per_hour')
            ->take(5)
            ->values()
            ->all();

        return [
            'total_spent' => round($totalSpent, 2),
            'total_hours' => round($totalHours, 1),
            'tracked_hours' => round($totalTrackedHours, 1),
            'estimated_hours' => round($totalEstimatedHours, 1),
            'cost_per_hour' => $costPerHour,
            'comparison' => [
                'netflix' => 15.49,
                'movie_theater' => 15.00,
                'books' => $costPerHour,
            ],
            'books_with_price' => $userBooks->count(),
            'books_with_tracked_time' => $booksWithTrackedTime,
            'books_with_estimated_time' => $booksWithEstimatedTime,
            'best_value_books' => $bestValueBooks,
        ];
    }

    /**
     * Calculate intensity level (0-4) based on pages read relative to max.
     */
    private function calculateIntensity(int $pages, int $maxPages): int
    {
        if ($pages === 0) {
            return 0;
        }

        $ratio = $pages / $maxPages;

        if ($ratio < 0.25) {
            return 1;
        }
        if ($ratio < 0.5) {
            return 2;
        }
        if ($ratio < 0.75) {
            return 3;
        }

        return 4;
    }

    /**
     * Calculate current and longest reading streaks.
     */
    private function calculateStreaks(Collection $sessions): array
    {
        if ($sessions->isEmpty()) {
            return ['current' => 0, 'longest' => 0];
        }

        $dates = $sessions
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->unique()
            ->sort()
            ->values();

        $longest = 1;
        $current = 0;
        $streak = 1;
        $today = Carbon::today()->format('Y-m-d');
        $yesterday = Carbon::yesterday()->format('Y-m-d');

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

        $lastDate = $dates->last();
        if ($lastDate === $today || $lastDate === $yesterday) {
            $current = 1;
            for ($i = $dates->count() - 2; $i >= 0; $i--) {
                $prev = Carbon::parse($dates[$i]);
                $curr = Carbon::parse($dates[$i + 1]);

                if ($curr->diffInDays($prev) === 1) {
                    $current++;
                } else {
                    break;
                }
            }
        }

        return [
            'current' => $current,
            'longest' => $longest,
        ];
    }

    /**
     * Detect reading rhythm pattern based on session distribution.
     */
    private function detectReadingRhythm(Collection $sessions): array
    {
        if ($sessions->isEmpty()) {
            return ['type' => 'balanced', 'label' => __('Balanced Reader')];
        }

        $dayDistribution = $sessions->groupBy(fn ($s) => Carbon::parse($s->date)->dayOfWeek);

        $weekendPages = ($dayDistribution->get(0)?->sum('pages_read') ?? 0)
            + ($dayDistribution->get(6)?->sum('pages_read') ?? 0);

        $weekdayPages = 0;
        for ($i = 1; $i <= 5; $i++) {
            $weekdayPages += $dayDistribution->get($i)?->sum('pages_read') ?? 0;
        }

        $totalPages = $weekendPages + $weekdayPages;
        if ($totalPages === 0) {
            return ['type' => 'balanced', 'label' => __('Balanced Reader')];
        }

        $weekendRatio = $weekendPages / $totalPages;
        $weekdayRatio = $weekdayPages / $totalPages;

        if ($weekendRatio >= 0.7) {
            return ['type' => 'weekend_warrior', 'label' => __('Weekend Warrior')];
        }

        if ($weekdayRatio >= 0.85) {
            return ['type' => 'weekday_devotee', 'label' => __('Weekday Devotee')];
        }

        $avgSessionDuration = $sessions->avg('duration_seconds') ?? 0;
        if ($avgSessionDuration > 5400) {
            return ['type' => 'marathon_reader', 'label' => __('Marathon Reader')];
        }

        $uniqueDays = $sessions
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->unique()
            ->count();

        $totalDays = $sessions->min('date')
            ? Carbon::parse($sessions->min('date'))->diffInDays(Carbon::today()) + 1
            : 1;

        $readingFrequency = $uniqueDays / max($totalDays, 1);
        if ($readingFrequency >= 0.8) {
            return ['type' => 'daily_reader', 'label' => __('Daily Reader')];
        }

        return ['type' => 'balanced', 'label' => __('Balanced Reader')];
    }

    /**
     * Calculate seasonal mood patterns from finished books.
     *
     * Uses LLM-classified moods to identify seasonal reading preferences.
     */
    private function calculateSeasonalPatterns(Collection $userBooks): array
    {
        $seasons = [
            'winter' => ['months' => [12, 1, 2], 'label' => __('Winter')],
            'spring' => ['months' => [3, 4, 5], 'label' => __('Spring')],
            'summer' => ['months' => [6, 7, 8], 'label' => __('Summer')],
            'fall' => ['months' => [9, 10, 11], 'label' => __('Fall')],
        ];

        $patterns = [];

        foreach ($seasons as $seasonKey => $seasonData) {
            $seasonBooks = $userBooks->filter(function ($ub) use ($seasonData) {
                $date = $ub->finished_at ?? $ub->started_at;
                if (! $date) {
                    return false;
                }

                return in_array(Carbon::parse($date)->month, $seasonData['months'], true);
            });

            if ($seasonBooks->isEmpty()) {
                continue;
            }

            $moodCounts = [];
            foreach ($seasonBooks as $ub) {
                $moods = $ub->book?->moods ?? [];
                foreach ($moods as $moodValue) {
                    $mood = MoodEnum::tryFrom($moodValue);
                    if ($mood !== null) {
                        $moodCounts[$mood->value] = ($moodCounts[$mood->value] ?? 0) + 1;
                    }
                }
            }

            if (empty($moodCounts)) {
                continue;
            }

            arsort($moodCounts);
            $topMoodKey = array_key_first($moodCounts);
            $topMood = MoodEnum::from($topMoodKey);
            $topCount = $moodCounts[$topMoodKey];
            $totalInSeason = $seasonBooks->count();

            $patterns[] = [
                'season' => $seasonKey,
                'label' => $seasonData['label'],
                'top_mood' => $topMood->label(),
                'top_mood_key' => $topMoodKey,
                'percentage' => round(($topCount / $totalInSeason) * 100),
            ];
        }

        return $patterns;
    }

    /**
     * Detect patterns in DNF books.
     */
    private function detectDnfPatterns(Collection $dnfBooks, Collection $allBooks): array
    {
        $patterns = [];

        if ($dnfBooks->isEmpty()) {
            return $patterns;
        }

        $longBookThreshold = 400;
        $longDnfBooks = $dnfBooks->filter(fn ($ub) => ($ub->book?->page_count ?? 0) > $longBookThreshold);
        $longAllBooks = $allBooks->filter(fn ($ub) => ($ub->book?->page_count ?? 0) > $longBookThreshold);

        if ($longAllBooks->count() > 0) {
            $longDnfRate = round(($longDnfBooks->count() / $longAllBooks->count()) * 100);
            if ($longDnfRate > 25) {
                $patterns[] = [
                    'pattern' => 'long_books',
                    'label' => __('You drop :rate% of books over :threshold pages', [
                        'rate' => $longDnfRate,
                        'threshold' => $longBookThreshold,
                    ]),
                    'threshold' => $longBookThreshold,
                    'rate' => $longDnfRate,
                ];
            }
        }

        $genreDnfCounts = [];
        $genreAllCounts = [];

        foreach ($allBooks as $ub) {
            $rawGenres = $ub->book?->genres ?? [];
            foreach ($rawGenres as $rawGenre) {
                $canonicalGenre = $this->normalizeGenre($rawGenre);
                if ($canonicalGenre === null) {
                    continue;
                }
                $genreAllCounts[$canonicalGenre] = ($genreAllCounts[$canonicalGenre] ?? 0) + 1;
            }
        }

        foreach ($dnfBooks as $ub) {
            $rawGenres = $ub->book?->genres ?? [];
            foreach ($rawGenres as $rawGenre) {
                $canonicalGenre = $this->normalizeGenre($rawGenre);
                if ($canonicalGenre === null) {
                    continue;
                }
                $genreDnfCounts[$canonicalGenre] = ($genreDnfCounts[$canonicalGenre] ?? 0) + 1;
            }
        }

        foreach ($genreDnfCounts as $genreKey => $dnfCount) {
            $allCount = $genreAllCounts[$genreKey] ?? 0;
            if ($allCount >= 3) {
                $genreDnfRate = round(($dnfCount / $allCount) * 100);
                if ($genreDnfRate > 40) {
                    $genreLabel = $this->getGenreLabel($genreKey);
                    $patterns[] = [
                        'pattern' => 'genre',
                        'label' => __('You abandon :rate% of :genre books', [
                            'rate' => $genreDnfRate,
                            'genre' => $genreLabel,
                        ]),
                        'genre' => $genreLabel,
                        'genre_key' => $genreKey,
                        'rate' => $genreDnfRate,
                    ];
                }
            }
        }

        return array_slice($patterns, 0, 3);
    }

    /**
     * Calculate at which progress percentage books are abandoned.
     */
    private function calculateAbandonmentPoints(Collection $dnfBooks): array
    {
        $ranges = [
            '0-25%' => 0,
            '25-50%' => 0,
            '50-75%' => 0,
            '75-100%' => 0,
        ];

        foreach ($dnfBooks as $ub) {
            $pageCount = $ub->book?->page_count ?? 0;
            if ($pageCount <= 0) {
                continue;
            }

            $progress = ($ub->current_page / $pageCount) * 100;

            if ($progress < 25) {
                $ranges['0-25%']++;
            } elseif ($progress < 50) {
                $ranges['25-50%']++;
            } elseif ($progress < 75) {
                $ranges['50-75%']++;
            } else {
                $ranges['75-100%']++;
            }
        }

        return array_map(fn ($range, $count) => [
            'range' => $range,
            'count' => $count,
        ], array_keys($ranges), array_values($ranges));
    }

    /**
     * Aggregate DNF reasons into top categories.
     */
    private function aggregateDnfReasons(Collection $dnfBooks): array
    {
        $reasonLabels = [
            'not_for_me' => __('Not for me right now'),
            'boring' => __('Boring / Too slow'),
            'writing' => __('Dislike the writing style'),
            'content' => __('Problematic content'),
            'other' => __('Other reason'),
        ];

        $reasonCounts = [];

        foreach ($dnfBooks as $ub) {
            $reason = $ub->dnf_reason;
            if ($reason && isset($reasonLabels[$reason])) {
                $reasonCounts[$reason] = ($reasonCounts[$reason] ?? 0) + 1;
            }
        }

        arsort($reasonCounts);

        return array_map(fn ($reason, $count) => [
            'reason' => $reason,
            'label' => $reasonLabels[$reason],
            'count' => $count,
        ], array_keys($reasonCounts), array_values($reasonCounts));
    }

    /**
     * Get calendar data for a specific year and optional month.
     */
    public function getCalendarData(User $user, int $year, ?int $month = null): array
    {
        $userBookIds = UserBook::where('user_id', $user->id)->pluck('id');

        if ($month !== null) {
            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();
        } else {
            $startDate = Carbon::create($year, 1, 1)->startOfYear();
            $endDate = Carbon::create($year, 12, 31)->endOfYear();
        }

        $sessions = ReadingSession::whereIn('user_book_id', $userBookIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->with('userBook.book')
            ->get();

        $sessionsByDate = $sessions->groupBy(fn ($s) => Carbon::parse($s->date)->format('Y-m-d'));

        $completedBooks = UserBook::where('user_id', $user->id)
            ->where('status', 'read')
            ->whereNotNull('finished_at')
            ->whereBetween('finished_at', [$startDate, $endDate])
            ->with('book')
            ->get()
            ->groupBy(fn ($ub) => Carbon::parse($ub->finished_at)->format('Y-m-d'));

        $maxPages = max($sessionsByDate->map(fn ($s) => $s->sum('pages_read'))->max() ?? 0, 1);

        $days = [];
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateStr = $date->format('Y-m-d');
            $daySessions = $sessionsByDate->get($dateStr, collect());
            $dayBooksCompleted = $completedBooks->get($dateStr, collect());

            $pagesRead = (int) $daySessions->sum('pages_read');

            $days[] = [
                'date' => $dateStr,
                'local_date_string' => $dateStr,
                'pages_read' => $pagesRead,
                'intensity' => $this->calculateIntensity($pagesRead, $maxPages),
                'sessions' => $daySessions->map(fn ($session) => [
                    'id' => $session->id,
                    'user_book_id' => $session->user_book_id,
                    'book_title' => $session->userBook->book?->title ?? 'Unknown',
                    'book_author' => $session->userBook->book?->author ?? 'Unknown',
                    'cover_url' => $session->userBook->book?->cover_url,
                    'pages_read' => $session->pages_read,
                    'duration_seconds' => $session->duration_seconds,
                    'notes' => $session->notes,
                ])->values()->all(),
                'books_completed' => $dayBooksCompleted->map(fn ($ub) => [
                    'id' => $ub->id,
                    'title' => $ub->book?->title ?? 'Unknown',
                    'author' => $ub->book?->author ?? 'Unknown',
                    'cover_url' => $ub->book?->cover_url,
                ])->values()->all(),
            ];
        }

        $monthlySummaries = [];
        $monthsToSummarize = $month !== null ? [$month] : range(1, 12);

        foreach ($monthsToSummarize as $m) {
            $monthStart = Carbon::create($year, $m, 1)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();

            $monthSessions = $sessions->filter(function ($s) use ($monthStart, $monthEnd) {
                $sessionDate = Carbon::parse($s->date);

                return $sessionDate->between($monthStart, $monthEnd);
            });

            $monthCompleted = UserBook::where('user_id', $user->id)
                ->where('status', 'read')
                ->whereNotNull('finished_at')
                ->whereBetween('finished_at', [$monthStart, $monthEnd])
                ->with('book')
                ->get();

            $topCover = $monthCompleted->first()?->book?->cover_url;

            $monthlySummaries[] = [
                'month' => $m,
                'year' => $year,
                'label' => $monthStart->format('F Y'),
                'books_completed' => $monthCompleted->count(),
                'pages_read' => (int) $monthSessions->sum('pages_read'),
                'sessions_count' => $monthSessions->count(),
                'top_book_cover' => $topCover,
            ];
        }

        return [
            'days' => $days,
            'monthly_summaries' => $monthlySummaries,
        ];
    }
}
