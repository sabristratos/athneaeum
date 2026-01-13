<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\ImportServiceInterface;
use App\Http\Controllers\Api\ImportController;
use App\Services\Import\GoodreadsImportService;
use Illuminate\Support\ServiceProvider;

class ImportServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->tag([
            GoodreadsImportService::class,
        ], ImportServiceInterface::class);

        $this->app->when(ImportController::class)
            ->needs(ImportServiceInterface::class)
            ->giveTagged(ImportServiceInterface::class);
    }
}
