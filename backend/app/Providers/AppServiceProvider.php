<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\ReadingSession;
use App\Models\UserBook;
use App\Observers\ReadingSessionObserver;
use App\Observers\UserBookObserver;
use App\Services\Authors\AuthorNormalizer;
use App\Services\Authors\OpenLibraryAuthorService;
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
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Model::unguard();
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());
        Model::preventAccessingMissingAttributes(! $this->app->isProduction());

        ReadingSession::observe(ReadingSessionObserver::class);
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
    }
}
