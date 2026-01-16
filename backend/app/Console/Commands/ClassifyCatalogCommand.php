<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Discovery\CatalogClassificationService;
use Illuminate\Console\Command;

/**
 * Classify catalog books using LLM for mood, intensity, and audience.
 */
class ClassifyCatalogCommand extends Command
{
    protected $signature = 'catalog:classify
                            {--batch=50 : Number of books to process per batch}
                            {--max=0 : Maximum books to classify (0 = unlimited)}
                            {--popular : Prioritize popular books first}
                            {--stats : Show classification statistics only}';

    protected $description = 'Classify catalog books for audience, intensity, and mood';

    public function handle(CatalogClassificationService $service): int
    {
        if (! $service->isEnabled()) {
            $this->error('LLM classification is not enabled. Set INGESTION_LLM_ENABLED=true and INGESTION_LLM_API_KEY in .env');

            return Command::FAILURE;
        }

        if ($this->option('stats')) {
            return $this->showStats($service);
        }

        $batchSize = (int) $this->option('batch');
        $maxBooks = (int) $this->option('max');
        $prioritizePopular = $this->option('popular');

        $this->info('Starting catalog classification...');
        $this->newLine();

        $stats = $service->getStats();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Books', $stats['total']],
                ['Already Classified', $stats['classified']],
                ['Pending Classification', $stats['pending']],
                ['Coverage', $stats['percentage'].'%'],
            ]
        );

        if ($stats['pending'] === 0) {
            $this->info('All books are already classified.');

            return Command::SUCCESS;
        }

        $this->newLine();
        $this->info("Processing up to ".($maxBooks > 0 ? $maxBooks : 'all')." books...");
        $this->newLine();

        $progressBar = $this->output->createProgressBar($maxBooks > 0 ? min($maxBooks, $stats['pending']) : $stats['pending']);
        $progressBar->start();

        $classified = 0;
        $skipped = 0;
        $errors = 0;

        $result = $service->batchClassify($batchSize, $maxBooks, $prioritizePopular);

        $progressBar->finish();
        $this->newLine(2);

        $this->info('Classification complete:');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Books Classified', $result['classified']],
                ['Books Skipped', $result['skipped']],
                ['Errors', $result['errors']],
            ]
        );

        $newStats = $service->getStats();
        $this->newLine();
        $this->info("New coverage: {$newStats['percentage']}%");

        return Command::SUCCESS;
    }

    private function showStats(CatalogClassificationService $service): int
    {
        $stats = $service->getStats();

        $this->info('Catalog Classification Statistics');
        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Books', $stats['total']],
                ['Classified', $stats['classified']],
                ['Pending', $stats['pending']],
                ['Coverage', $stats['percentage'].'%'],
            ]
        );

        return Command::SUCCESS;
    }
}
