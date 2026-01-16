<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\SeedData\SeedDataService;
use Illuminate\Console\Command;

/**
 * Shows the status of seed data files and provides usage instructions.
 */
class SeedDataStatusCommand extends Command
{
    protected $signature = 'seed-data:status';

    protected $description = 'Show status of seed data files and usage instructions';

    public function __construct(
        private readonly SeedDataService $seedData
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Seed Data Status');
        $this->info('================');
        $this->newLine();

        $stats = $this->seedData->getStats();
        $tracking = $this->seedData->getTrackingStats();

        $this->table(
            ['Type', 'CSV Records', 'Media Files', 'Processed', 'CSV Path'],
            collect($stats)->map(fn ($s, $type) => [
                $type,
                $s['csv_records'],
                $s['media_files'],
                $tracking[$type] ?? 0,
                $s['csv_path'],
            ])->toArray()
        );

        $this->newLine();
        $this->info('Available Commands:');
        $this->line('');
        $this->line('  <comment>Build seed data from external APIs:</comment>');
        $this->line('    php artisan seed-data:build-books --limit=100    # Process books from Kaggle CSV');
        $this->line('    php artisan seed-data:build-authors --limit=50   # Enrich authors from books');
        $this->line('');
        $this->line('  <comment>Use seed data:</comment>');
        $this->line('    php artisan db:seed --class=MasterDataSeeder     # Import from CSVs after migrate:fresh');
        $this->line('');
        $this->line('  <comment>Options for build commands:</comment>');
        $this->line('    --skip=N         Skip first N records');
        $this->line('    --no-covers      Skip downloading covers/photos');
        $this->line('    --no-classify    Skip Gemini classification (books only)');
        $this->line('    --force          Reprocess already-processed items');
        $this->line('    --dry-run        Preview without saving');
        $this->newLine();

        $this->info('Location: '.$this->seedData->getBasePath());
        $this->line('');
        $this->line('<comment>Note:</comment> Commands automatically skip already-processed items.');
        $this->line('Use --force to reprocess, or delete .tracking.json to reset.');

        return self::SUCCESS;
    }
}
