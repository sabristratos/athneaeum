<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Discovery\CatalogIngestionService;
use Illuminate\Console\Command;

/**
 * Command to extract and link authors from catalog books.
 *
 * Processes books that have author strings but no linked
 * author relationships, using Open Library for enrichment.
 */
class ExtractCatalogAuthorsCommand extends Command
{
    protected $signature = 'catalog:extract-authors
                            {--batch=100 : Number of books to process per batch}
                            {--limit= : Maximum number of books to process}';

    protected $description = 'Extract and link authors from catalog books';

    public function handle(CatalogIngestionService $service): int
    {
        $batchSize = (int) $this->option('batch');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        $this->info('Extracting authors from catalog books...');
        $this->info("Batch size: {$batchSize}");

        if ($limit) {
            $this->info("Limit: {$limit} books");
        }

        $this->newLine();

        $results = $service->processAuthorRelationships($batchSize, $limit);

        $this->info('Author extraction complete:');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Books Processed', $results['processed']],
                ['Authors Linked', $results['linked']],
                ['Errors', $results['errors']],
            ]
        );

        if ($results['errors'] > 0) {
            $this->warn('Some books had errors. Check the logs for details.');
        }

        return self::SUCCESS;
    }
}
