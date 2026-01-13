<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\AuthorResolverInterface;
use App\Contracts\BookIngestionServiceInterface;
use App\Contracts\DataSanitizerInterface;
use App\Contracts\GenreMapperInterface;
use App\Contracts\PublisherResolverInterface;
use App\Services\Ingestion\BookIngestionService;
use App\Services\Ingestion\DataSanitizer;
use App\Services\Ingestion\Resolvers\AuthorResolver;
use App\Services\Ingestion\Resolvers\GenreMapper;
use App\Services\Ingestion\Resolvers\PublisherResolver;
use Illuminate\Support\ServiceProvider;

/**
 * Service provider for the book ingestion pipeline.
 */
class IngestionServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(DataSanitizerInterface::class, DataSanitizer::class);
        $this->app->singleton(AuthorResolverInterface::class, AuthorResolver::class);
        $this->app->singleton(GenreMapperInterface::class, GenreMapper::class);
        $this->app->singleton(PublisherResolverInterface::class, PublisherResolver::class);
        $this->app->singleton(BookIngestionServiceInterface::class, BookIngestionService::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
