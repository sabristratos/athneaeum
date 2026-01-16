<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\IngestKaggleCatalogJob;
use Illuminate\Console\Command;

class IngestCatalogCommand extends Command
{
    protected $signature = 'catalog:ingest {file : Path to the CSV file}';

    protected $description = 'Ingest a book catalog CSV into the discovery database';

    public function handle(): int
    {
        $file = $this->argument('file');

        if (! file_exists($file)) {
            $this->error("File not found: {$file}");

            return self::FAILURE;
        }

        $this->info("Dispatching ingestion job for: {$file}");

        IngestKaggleCatalogJob::dispatch($file);

        $this->info('Job dispatched! Run `php artisan queue:work` to process.');
        $this->info('Monitor progress in storage/logs/laravel.log');

        return self::SUCCESS;
    }
}
