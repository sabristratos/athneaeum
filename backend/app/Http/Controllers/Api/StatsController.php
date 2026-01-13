<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\BookStatusEnum;
use App\Http\Controllers\Controller;
use App\Models\ReadingSession;
use App\Models\UserBook;
use App\Services\Stats\ReaderDNAService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function __construct(
        private ReaderDNAService $readerDNAService
    ) {}

    /**
     * Get reading statistics for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $userBookIds = UserBook::where('user_id', $user->id)->pluck('id');

        $allSessions = ReadingSession::whereIn('user_book_id', $userBookIds)
            ->with('userBook')
            ->get();

        $totalPagesRead = $allSessions->sum('pages_read');
        $totalSessions = $allSessions->count();
        $totalReadingTimeSeconds = $allSessions->sum('duration_seconds') ?? 0;

        $booksCompleted = UserBook::where('user_id', $user->id)
            ->where('status', BookStatusEnum::Read)
            ->count();

        $booksInProgress = UserBook::where('user_id', $user->id)
            ->where('status', BookStatusEnum::Reading)
            ->count();

        $avgPagesPerSession = $totalSessions > 0
            ? (int) round($totalPagesRead / $totalSessions)
            : 0;

        $sessionsWithDuration = $allSessions->filter(fn ($s) => $s->duration_seconds > 0);
        $avgSessionDurationSeconds = $sessionsWithDuration->count() > 0
            ? (int) round($sessionsWithDuration->avg('duration_seconds'))
            : 0;

        $streaks = $this->calculateStreaks($allSessions);

        $thisWeekStats = $this->getPeriodStats($allSessions, now()->startOfWeek(), now());
        $thisMonthStats = $this->getPeriodStats($allSessions, now()->startOfMonth(), now());

        $recentSessions = ReadingSession::whereIn('user_book_id', $userBookIds)
            ->with('userBook.book')
            ->latest('date')
            ->limit(10)
            ->get();

        return response()->json([
            'total_pages_read' => $totalPagesRead,
            'total_sessions' => $totalSessions,
            'total_reading_time_seconds' => $totalReadingTimeSeconds,
            'total_reading_time_formatted' => $this->formatDuration($totalReadingTimeSeconds),
            'books_completed' => $booksCompleted,
            'books_in_progress' => $booksInProgress,
            'current_streak_days' => $streaks['current'],
            'longest_streak_days' => $streaks['longest'],
            'avg_pages_per_session' => $avgPagesPerSession,
            'avg_session_duration_seconds' => $avgSessionDurationSeconds,
            'avg_session_duration_formatted' => $this->formatDuration($avgSessionDurationSeconds),
            'this_week' => $thisWeekStats,
            'this_month' => $thisMonthStats,
            'recent_sessions' => $recentSessions->map(fn ($session) => [
                'id' => $session->id,
                'date' => $session->date->format('Y-m-d'),
                'pages_read' => $session->pages_read,
                'start_page' => $session->start_page,
                'end_page' => $session->end_page,
                'duration_seconds' => $session->duration_seconds,
                'formatted_duration' => $session->formatted_duration,
                'notes' => $session->notes,
                'book' => [
                    'id' => $session->userBook->book->id,
                    'title' => $session->userBook->book->title,
                    'author' => $session->userBook->book->author,
                    'cover_url' => $session->userBook->book->cover_url,
                ],
            ]),
        ]);
    }

    /**
     * Calculate current and longest reading streaks.
     *
     * @param  \Illuminate\Support\Collection<int, ReadingSession>  $sessions
     * @return array{current: int, longest: int}
     */
    private function calculateStreaks($sessions): array
    {
        if ($sessions->isEmpty()) {
            return ['current' => 0, 'longest' => 0];
        }

        $uniqueDates = $sessions
            ->pluck('date')
            ->map(fn ($date) => Carbon::parse($date)->format('Y-m-d'))
            ->unique()
            ->sort()
            ->values();

        if ($uniqueDates->isEmpty()) {
            return ['current' => 0, 'longest' => 0];
        }

        $longestStreak = 1;
        $currentStreak = 1;
        $tempStreak = 1;

        for ($i = 1; $i < $uniqueDates->count(); $i++) {
            $prevDate = Carbon::parse($uniqueDates[$i - 1]);
            $currDate = Carbon::parse($uniqueDates[$i]);

            if ($prevDate->diffInDays($currDate) === 1) {
                $tempStreak++;
            } else {
                $longestStreak = max($longestStreak, $tempStreak);
                $tempStreak = 1;
            }
        }
        $longestStreak = max($longestStreak, $tempStreak);

        $lastSessionDate = Carbon::parse($uniqueDates->last());
        $today = now()->startOfDay();

        if ($lastSessionDate->isSameDay($today) || $lastSessionDate->isSameDay($today->copy()->subDay())) {
            $currentStreak = $tempStreak;

            if ($lastSessionDate->isSameDay($today->copy()->subDay())) {
                for ($i = $uniqueDates->count() - 2; $i >= 0; $i--) {
                    $prevDate = Carbon::parse($uniqueDates[$i]);
                    $currDate = Carbon::parse($uniqueDates[$i + 1]);

                    if ($prevDate->diffInDays($currDate) === 1) {
                        $currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        } else {
            $currentStreak = 0;
        }

        return [
            'current' => $currentStreak,
            'longest' => $longestStreak,
        ];
    }

    /**
     * Get stats for a specific time period.
     *
     * @param  \Illuminate\Support\Collection<int, ReadingSession>  $sessions
     * @return array{pages_read: int, sessions: int, reading_time_seconds: int, reading_time_formatted: string}
     */
    private function getPeriodStats($sessions, Carbon $startDate, Carbon $endDate): array
    {
        $periodSessions = $sessions->filter(function ($session) use ($startDate, $endDate) {
            $sessionDate = Carbon::parse($session->date);

            return $sessionDate->between($startDate, $endDate);
        });

        $pagesRead = $periodSessions->sum('pages_read');
        $sessionCount = $periodSessions->count();
        $readingTimeSeconds = $periodSessions->sum('duration_seconds') ?? 0;

        return [
            'pages_read' => $pagesRead,
            'sessions' => $sessionCount,
            'reading_time_seconds' => $readingTimeSeconds,
            'reading_time_formatted' => $this->formatDuration($readingTimeSeconds),
        ];
    }

    /**
     * Format duration in seconds to human-readable string.
     */
    private function formatDuration(int $seconds): ?string
    {
        if ($seconds <= 0) {
            return null;
        }

        $hours = (int) floor($seconds / 3600);
        $minutes = (int) floor(($seconds % 3600) / 60);

        if ($hours > 0) {
            return sprintf('%dh %dm', $hours, $minutes);
        }

        return sprintf('%dm', $minutes);
    }

    /**
     * Get 365-day heatmap data for reading activity.
     */
    public function heatmap(Request $request): JsonResponse
    {
        return response()->json(
            $this->readerDNAService->getHeatmapData($request->user())
        );
    }

    /**
     * Get reading velocity by book format.
     */
    public function formatVelocity(Request $request): JsonResponse
    {
        return response()->json(
            $this->readerDNAService->getFormatVelocity($request->user())
        );
    }

    /**
     * Get tag and genre breakdown (mood ring).
     */
    public function moodRing(Request $request): JsonResponse
    {
        return response()->json(
            $this->readerDNAService->getMoodRing($request->user())
        );
    }

    /**
     * Get DNF analytics and abandonment patterns.
     */
    public function dnfAnalytics(Request $request): JsonResponse
    {
        return response()->json(
            $this->readerDNAService->getDnfAnalytics($request->user())
        );
    }

    /**
     * Get page economy analysis.
     */
    public function pageEconomy(Request $request): JsonResponse
    {
        return response()->json(
            $this->readerDNAService->getPageEconomy($request->user())
        );
    }

    /**
     * Get calendar data for reading activity visualization.
     */
    public function calendar(Request $request): JsonResponse
    {
        $year = (int) $request->input('year', now()->year);
        $month = $request->has('month') ? (int) $request->input('month') : null;

        return response()->json(
            $this->readerDNAService->getCalendarData($request->user(), $year, $month)
        );
    }
}
