<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Contracts\Discovery\CatalogIngestionServiceInterface;
use App\Jobs\FetchCatalogCoversJob;
use App\Jobs\GenerateCatalogEmbeddingsJob;
use App\Models\Author;
use App\Models\CatalogBook;
use App\Models\Genre;
use App\Services\Discovery\CatalogClassificationService;
use App\Services\Discovery\CatalogIngestionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

/**
 * Master command to set up the discovery catalog with all data.
 *
 * Orchestrates seeding, ingestion, author extraction, genre mapping,
 * and optionally cover fetching and classification.
 */
class SetupCatalogCommand extends Command
{
    protected $signature = 'catalog:setup
                            {file : Path to the CSV file}
                            {--fresh : Truncate catalog tables first}
                            {--with-classify : Enable LLM classification (slow)}';

    protected $description = 'Set up the discovery catalog with genres, books, authors, and covers';

    private int $stepNumber = 0;

    private int $totalSteps = 6;

    public function handle(
        CatalogIngestionServiceInterface $ingestionService,
        CatalogIngestionService $catalogService,
        CatalogClassificationService $classificationService
    ): int {
        $file = $this->argument('file');

        if (! file_exists($file)) {
            $this->error("File not found: {$file}");

            return self::FAILURE;
        }

        $withClassify = $this->option('with-classify');

        if ($withClassify) {
            $this->totalSteps = 7;
        }

        $this->info('');
        $this->info('╔══════════════════════════════════════════╗');
        $this->info('║       Discovery Catalog Setup            ║');
        $this->info('╚══════════════════════════════════════════╝');
        $this->info('');

        if ($this->option('fresh')) {
            $this->step('Truncating catalog tables');
            CatalogBook::truncate();
            $this->done('Tables cleared');
        }

        $this->step('Seeding genres');
        Artisan::call('db:seed', ['--class' => 'GenreSeeder', '--force' => true]);
        $genreCount = Genre::count();
        $this->done("{$genreCount} genres");

        $this->step('Seeding system tags');
        Artisan::call('db:seed', ['--class' => 'TagSeeder', '--force' => true]);
        $this->done('System tags created');

        $this->step('Ingesting catalog');
        $results = $ingestionService->ingestFromCsv($file, 500);
        $this->done("{$results['processed']} books");

        $this->step('Extracting authors');
        $authorResults = $catalogService->processAuthorRelationships(100);
        $this->done("{$authorResults['linked']} linked");

        $this->step('Mapping genres');
        $genreResults = $catalogService->processGenreRelationships(100);
        $this->done("{$genreResults['linked']} mapped");

        $this->step('Dispatching cover fetch job');
        $pending = CatalogBook::whereNull('cover_url')->count();
        if ($pending > 0) {
            FetchCatalogCoversJob::dispatch(50, 0, 5000);
            GenerateCatalogEmbeddingsJob::dispatch();
            $this->done("Job queued ({$pending} pending)");
        } else {
            $this->done('All books have covers');
        }

        if ($withClassify) {
            $this->step('Classifying books (LLM)');
            if (! $classificationService->isEnabled()) {
                $this->warn('LLM not enabled. Set INGESTION_LLM_ENABLED=true');
            } else {
                $classResults = $classificationService->batchClassify(50, 100, true);
                $this->done("{$classResults['classified']} classified");
            }
        }

        $this->info('');
        $this->info('╔══════════════════════════════════════════╗');
        $this->info('║           Setup Complete!                ║');
        $this->info('╚══════════════════════════════════════════╝');
        $this->info('');

        $this->table(
            ['Metric', 'Count'],
            [
                ['Genres', Genre::count()],
                ['Catalog Books', CatalogBook::count()],
                ['Authors', Author::count()],
                ['Books with Covers', CatalogBook::whereNotNull('cover_url')->count()],
                ['Books Classified', CatalogBook::where('is_classified', true)->count()],
            ]
        );

        $this->info('');
        $this->info('Run `php artisan queue:work` to process background jobs.');
        $this->info('');

        return self::SUCCESS;
    }

    private function step(string $message): void
    {
        $this->stepNumber++;
        $this->output->write(
            sprintf('  [%d/%d] %s ', $this->stepNumber, $this->totalSteps, $message)
        );
    }

    private function done(string $result): void
    {
        $dots = str_repeat('.', max(1, 30 - strlen($result)));
        $this->info("{$dots} <fg=green>{$result}</>");
    }
}
