<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\BookSearchServiceInterface;
use App\Services\BookSearch\GoogleBooksService;
use Illuminate\Support\ServiceProvider;

/**
 * Service provider for binding book search service implementations.
 *
 * The active provider is determined by the BOOK_SEARCH_PROVIDER env variable.
 * Currently only Google Books is supported. OPDS is configured per-user.
 */
class BookSearchServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            BookSearchServiceInterface::class,
            fn () => new GoogleBooksService
        );
    }
}
