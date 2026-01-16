<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\GenreEnum;
use App\Models\UnmappedGenre;
use Illuminate\Console\Command;
use League\Csv\Writer;

/**
 * Command to review unmapped genres from catalog ingestion.
 *
 * Shows the most common unmapped genres and optionally
 * exports them to CSV for review.
 */
class ReviewUnmappedGenresCommand extends Command
{
    protected $signature = 'catalog:review-unmapped
                            {--limit=50 : Number of unmapped genres to show}
                            {--export= : Export to CSV file path}
                            {--show-canonical : Show all canonical genres for reference}';

    protected $description = 'Review unmapped genres from catalog ingestion';

    public function handle(): int
    {
        if ($this->option('show-canonical')) {
            $this->showCanonicalGenres();

            return self::SUCCESS;
        }

        $limit = (int) $this->option('limit');
        $exportPath = $this->option('export');

        $unmapped = UnmappedGenre::mostCommon()
            ->limit($limit)
            ->get();

        if ($unmapped->isEmpty()) {
            $this->info('No unmapped genres found.');

            return self::SUCCESS;
        }

        $this->info("Top {$unmapped->count()} unmapped genres:");
        $this->newLine();

        $tableData = $unmapped->map(fn ($g) => [
            $g->raw_genre,
            $g->occurrence_count,
            $g->suggested_mapping ?? '-',
        ])->all();

        $this->table(
            ['Genre', 'Occurrences', 'Suggested Mapping'],
            $tableData
        );

        $totalCount = UnmappedGenre::count();
        $totalOccurrences = UnmappedGenre::sum('occurrence_count');

        $this->newLine();
        $this->info("Total unmapped genres: {$totalCount}");
        $this->info("Total unmapped occurrences: {$totalOccurrences}");

        if ($exportPath) {
            $this->exportToCsv($exportPath);
        }

        return self::SUCCESS;
    }

    /**
     * Show all canonical genres for reference.
     */
    private function showCanonicalGenres(): void
    {
        $this->info('Canonical Genres (GenreEnum):');
        $this->newLine();

        $grouped = [];
        foreach (GenreEnum::cases() as $genre) {
            $category = $genre->category();
            $grouped[$category][] = [
                $genre->value,
                $genre->label(),
            ];
        }

        foreach ($grouped as $category => $genres) {
            $this->info(ucfirst($category).':');
            $this->table(['Value', 'Label'], $genres);
            $this->newLine();
        }
    }

    /**
     * Export unmapped genres to CSV.
     */
    private function exportToCsv(string $path): void
    {
        $unmapped = UnmappedGenre::mostCommon()->get();

        $csv = Writer::createFromPath($path, 'w+');
        $csv->insertOne(['raw_genre', 'occurrence_count', 'suggested_mapping']);

        foreach ($unmapped as $genre) {
            $csv->insertOne([
                $genre->raw_genre,
                $genre->occurrence_count,
                $genre->suggested_mapping ?? '',
            ]);
        }

        $this->info("Exported {$unmapped->count()} unmapped genres to: {$path}");
    }
}
