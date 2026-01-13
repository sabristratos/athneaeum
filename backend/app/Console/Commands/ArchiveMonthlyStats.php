<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\BookStatusEnum;
use App\Models\ReadingSession;
use App\Models\User;
use App\Models\UserBook;
use App\Models\UserStatistics;
use App\Models\UserStatisticsMonthly;
use App\Services\Stats\Concerns\NormalizesGenres;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Artisan command to archive monthly statistics.
 *
 * Run on the 1st of each month to archive the previous month's data
 * and reset monthly counters.
 */
class ArchiveMonthlyStats extends Command
{
    use NormalizesGenres;

    protected $signature = 'stats:archive-month
                            {--year= : Archive for specific year}
                            {--month= : Archive for specific month}';

    protected $description = 'Archive monthly statistics and reset counters';

    public function handle(): int
    {
        $year = $this->option('year') ?? now()->subMonth()->year;
        $month = $this->option('month') ?? now()->subMonth()->month;

        $this->info("Archiving statistics for {$year}-{$month}...");

        $users = User::all();
        $bar = $this->output->createProgressBar($users->count());
        $bar->start();

        foreach ($users as $user) {
            $this->archiveForUser($user, (int) $year, (int) $month);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        if ($year == now()->subMonth()->year && $month == now()->subMonth()->month) {
            $this->resetMonthlyCounters();
        }

        $this->info('Monthly statistics archived successfully!');

        return self::SUCCESS;
    }

    private function archiveForUser(User $user, int $year, int $month): void
    {
        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $userBookIds = UserBook::where('user_id', $user->id)->pluck('id');

        $sessions = ReadingSession::whereIn('user_book_id', $userBookIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        $booksStarted = UserBook::where('user_id', $user->id)
            ->whereBetween('started_at', [$startDate, $endDate])
            ->count();

        $booksRead = UserBook::where('user_id', $user->id)
            ->where('status', BookStatusEnum::Read)
            ->whereBetween('finished_at', [$startDate, $endDate])
            ->count();

        $booksDnf = UserBook::where('user_id', $user->id)
            ->where('is_dnf', true)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        $totalPages = $sessions->sum('pages_read');
        $totalSeconds = $sessions->sum('duration_seconds');

        $uniqueDays = $sessions
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->unique()
            ->count();

        $genreCounts = [];
        $userBooks = UserBook::where('user_id', $user->id)
            ->whereBetween('finished_at', [$startDate, $endDate])
            ->with('book')
            ->get();

        foreach ($userBooks as $ub) {
            foreach ($ub->book?->genres ?? [] as $rawGenre) {
                $canonicalGenre = $this->normalizeGenre($rawGenre);
                if ($canonicalGenre !== null) {
                    $label = $this->getGenreLabel($canonicalGenre);
                    $genreCounts[$label] = ($genreCounts[$label] ?? 0) + 1;
                }
            }
        }

        $topBooks = $userBooks
            ->sortByDesc('rating')
            ->take(5)
            ->map(fn ($ub) => [
                'id' => $ub->book_id,
                'title' => $ub->book?->title,
                'rating' => $ub->rating,
            ])
            ->values()
            ->toArray();

        $avgRating = $userBooks->whereNotNull('rating')->avg('rating');

        UserStatisticsMonthly::updateOrCreate(
            ['user_id' => $user->id, 'year' => $year, 'month' => $month],
            [
                'books_started' => $booksStarted,
                'books_read' => $booksRead,
                'books_dnf' => $booksDnf,
                'pages_read' => $totalPages,
                'reading_seconds' => $totalSeconds,
                'sessions_count' => $sessions->count(),
                'avg_rating' => $avgRating ? round($avgRating, 2) : null,
                'avg_pages_per_session' => $sessions->count() > 0
                    ? round($totalPages / $sessions->count(), 2)
                    : null,
                'avg_pages_per_hour' => $totalSeconds > 0
                    ? round($totalPages / ($totalSeconds / 3600), 2)
                    : null,
                'active_days' => $uniqueDays,
                'genres' => $genreCounts,
                'top_books' => $topBooks,
            ]
        );
    }

    private function resetMonthlyCounters(): void
    {
        $this->info('Resetting monthly counters...');

        UserStatistics::query()->update([
            'books_read_this_month' => 0,
            'pages_read_this_month' => 0,
            'reading_seconds_this_month' => 0,
        ]);
    }
}
