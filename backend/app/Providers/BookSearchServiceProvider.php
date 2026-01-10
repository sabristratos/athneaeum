<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\BookSearchServiceInterface;
use App\Services\BookSearch\GoogleBooksService;
use App\Services\BookSearch\OpenLibraryService;
use Illuminate\Support\ServiceProvider;

/**
 * Service provider for binding book search service implementations.
 *
 * The active provider is determined by the BOOK_SEARCH_PROVIDER env variable.
 */
class BookSearchServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            BookSearchServiceInterface::class,
            fn () => match (config('services.book_search.provider')) {
                'open_library' => new OpenLibraryService,
                default => new GoogleBooksService,
            }
        );
    }
}
