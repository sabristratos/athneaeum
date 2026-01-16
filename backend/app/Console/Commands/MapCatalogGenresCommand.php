<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Discovery\CatalogIngestionService;
use Illuminate\Console\Command;

/**
 * Command to map genres from catalog books to canonical genres.
 *
 * Processes books that have raw genre strings but no linked
 * genre relationships, mapping them to GenreEnum values.
 */
class MapCatalogGenresCommand extends Command
{
    protected $signature = 'catalog:map-genres
                            {--batch=100 : Number of books to process per batch}
                            {--limit= : Maximum number of books to process}';

    protected $description = 'Map genres from catalog books to canonical genres';

    public function handle(CatalogIngestionService $service): int
    {
        $batchSize = (int) $this->option('batch');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        $this->info('Mapping genres from catalog books...');
        $this->info("Batch size: {$batchSize}");

        if ($limit) {
            $this->info("Limit: {$limit} books");
        }

        $this->newLine();

        $results = $service->processGenreRelationships($batchSize, $limit);

        $this->info('Genre mapping complete:');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Books Processed', $results['processed']],
                ['Genres Linked', $results['linked']],
                ['Unmapped', $results['unmapped']],
                ['Errors', $results['errors']],
            ]
        );

        if ($results['unmapped'] > 0) {
            $this->warn("Some genres couldn't be mapped. Run 'php artisan catalog:review-unmapped' to see them.");
        }

        if ($results['errors'] > 0) {
            $this->warn('Some books had errors. Check the logs for details.');
        }

        return self::SUCCESS;
    }
}
