<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\Discovery\BookResolutionServiceInterface;
use App\Contracts\Discovery\CatalogIngestionServiceInterface;
use App\Contracts\Discovery\CoverStorageServiceInterface;
use App\Contracts\Discovery\EmbeddingServiceInterface;
use App\Contracts\Discovery\RecommendationServiceInterface;
use App\Contracts\Discovery\UserSignalServiceInterface;
use App\Contracts\MediaStorageServiceInterface;
use App\Contracts\Metadata\FieldMergerInterface;
use App\Contracts\Metadata\MetadataAggregatorInterface;
use App\Models\ReadingSession;
use App\Models\ReadThrough;
use App\Models\UserBook;
use App\Observers\ReadingSessionObserver;
use App\Observers\ReadThroughObserver;
use App\Observers\UserBookObserver;
use App\Services\Authors\AuthorNormalizer;
use App\Services\Authors\OpenLibraryAuthorService;
use App\Services\Discovery\BookResolutionService;
use App\Services\Discovery\CatalogIngestionService;
use App\Services\Discovery\CoverStorageService;
use App\Services\Discovery\EmbeddingService;
use App\Services\Discovery\RecommendationService;
use App\Services\Discovery\UserSignalService;
use App\Services\MediaStorageService;
use App\Services\Metadata\FieldMerger;
use App\Services\Metadata\MetadataAggregator;
use App\Services\Metadata\ResultScorer;
use App\Services\Metadata\Sources\GoogleBooksSource;
use App\Services\Metadata\Sources\OpenLibrarySource;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(OpenLibraryAuthorService::class);
        $this->app->singleton(AuthorNormalizer::class);
        $this->app->bind(MediaStorageServiceInterface::class, MediaStorageService::class);

        // Discovery services
        $this->app->bind(EmbeddingServiceInterface::class, EmbeddingService::class);
        $this->app->bind(CatalogIngestionServiceInterface::class, CatalogIngestionService::class);
        $this->app->bind(RecommendationServiceInterface::class, RecommendationService::class);
        $this->app->bind(UserSignalServiceInterface::class, UserSignalService::class);
        $this->app->bind(BookResolutionServiceInterface::class, BookResolutionService::class);
        $this->app->bind(CoverStorageServiceInterface::class, CoverStorageService::class);

        // Metadata aggregation services
        $this->app->bind(FieldMergerInterface::class, FieldMerger::class);

        $this->app->singleton(MetadataAggregatorInterface::class, function ($app) {
            $aggregator = new MetadataAggregator(
                $app->make(ResultScorer::class),
                $app->make(FieldMergerInterface::class)
            );

            if (config('metadata.sources.open_library.enabled', true)) {
                $aggregator->registerSource($app->make(OpenLibrarySource::class));
            }

            if (config('metadata.sources.google_books.enabled', false)) {
                $aggregator->registerSource($app->make(GoogleBooksSource::class));
            }

            return $aggregator;
        });
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Model::unguard();
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());
        Model::preventAccessingMissingAttributes(! $this->app->isProduction());

        ReadingSession::observe(ReadingSessionObserver::class);
        ReadThrough::observe(ReadThroughObserver::class);
        UserBook::observe(UserBookObserver::class);

        RateLimiter::for('google-books-api', function () {
            return Limit::perMinute(30)->by('google-books');
        });

        RateLimiter::for('openlibrary-api', function () {
            return Limit::perMinute(60)->by('openlibrary');
        });

        RateLimiter::for('opds-api', function () {
            return Limit::perMinute(60)->by('opds');
        });

        RateLimiter::for('llm-classification', function () {
            return Limit::perMinute(10)->by('llm');
        });

        RateLimiter::for('embedding-generation', function () {
            return Limit::perMinute(60)->by('embedding');
        });

        RateLimiter::for('discovery-signals', function ($request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });
    }
}
