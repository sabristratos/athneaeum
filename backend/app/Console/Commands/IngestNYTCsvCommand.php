<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Discovery\NYTBestsellerService;
use Illuminate\Console\Command;

/**
 * Ingest NYT bestseller data from CSV file.
 */
class IngestNYTCsvCommand extends Command
{
    protected $signature = 'nyt:ingest-csv
                            {--path=NYT/nyt_library_export.csv : Path to CSV file relative to base path}
                            {--stats : Show NYT bestseller statistics only}';

    protected $description = 'Ingest NYT bestseller data from CSV file into catalog';

    public function handle(NYTBestsellerService $service): int
    {
        if ($this->option('stats')) {
            return $this->showStats($service);
        }

        $relativePath = $this->option('path');
        $filePath = base_path($relativePath);

        if (! file_exists($filePath)) {
            $this->error("CSV file not found: {$filePath}");

            return Command::FAILURE;
        }

        $this->info('Starting NYT bestseller CSV ingestion...');
        $this->info("File: {$filePath}");
        $this->newLine();

        $beforeStats = $service->getStats();
        $this->info("Current NYT bestsellers in catalog: {$beforeStats['total']}");
        $this->newLine();

        try {
            $results = $service->ingestFromCsv($filePath);

            $this->newLine();
            $this->info('Ingestion complete:');
            $this->table(
                ['Metric', 'Count'],
                [
                    ['Books Imported', $results['imported']],
                    ['Books Updated', $results['updated']],
                    ['Books Skipped', $results['skipped']],
                    ['Errors', count($results['errors'])],
                ]
            );

            if (! empty($results['errors'])) {
                $this->newLine();
                $this->warn('Errors:');
                foreach ($results['errors'] as $error) {
                    $this->line("  - {$error}");
                }
            }

            $afterStats = $service->getStats();
            $this->newLine();
            $this->info("NYT bestsellers in catalog: {$afterStats['total']}");
            $this->table(
                ['Category', 'Count'],
                [
                    ['Fiction', $afterStats['fiction']],
                    ['Nonfiction', $afterStats['nonfiction']],
                    ['Avg Weeks on List', $afterStats['avg_weeks']],
                ]
            );

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Ingestion failed: {$e->getMessage()}");

            return Command::FAILURE;
        }
    }

    private function showStats(NYTBestsellerService $service): int
    {
        $stats = $service->getStats();

        $this->info('NYT Bestseller Statistics');
        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total NYT Bestsellers', $stats['total']],
                ['Fiction', $stats['fiction']],
                ['Nonfiction', $stats['nonfiction']],
                ['Average Weeks on List', $stats['avg_weeks']],
            ]
        );

        return Command::SUCCESS;
    }
}
