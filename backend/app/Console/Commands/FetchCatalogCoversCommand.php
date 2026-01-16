<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\FetchCatalogCoversJob;
use App\Models\CatalogBook;
use Illuminate\Console\Command;

class FetchCatalogCoversCommand extends Command
{
    protected $signature = 'catalog:covers
        {--limit=5000 : Maximum number of books to process}
        {--batch=50 : Batch size for processing}';

    protected $description = 'Fetch cover URLs for catalog books from Google Books API';

    public function handle(): int
    {
        $pending = CatalogBook::whereNull('cover_url')->count();

        if ($pending === 0) {
            $this->info('All catalog books already have cover URLs.');

            return self::SUCCESS;
        }

        $limit = (int) $this->option('limit');
        $batch = (int) $this->option('batch');

        $this->info("Found {$pending} books without covers.");
        $this->info("Dispatching cover fetch job (limit: {$limit}, batch: {$batch})...");

        FetchCatalogCoversJob::dispatch($batch, 0, $limit);

        $this->info('Job dispatched! Run `php artisan queue:work` to process.');

        return self::SUCCESS;
    }
}
