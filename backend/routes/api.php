<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuthorController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\ImportController;
use App\Http\Controllers\Api\LibraryController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ReadingGoalController;
use App\Http\Controllers\Api\SeriesController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserPreferenceController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
    Route::post('/reset-password', [PasswordResetController::class, 'reset']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [UserController::class, 'show']);
    Route::post('/user/onboarding-complete', [UserController::class, 'completeOnboarding']);
    Route::patch('/user', [UserController::class, 'update']);
    Route::patch('/user/password', [UserController::class, 'changePassword']);
    Route::patch('/user/theme', [UserController::class, 'updateTheme']);
    Route::post('/user/avatar', [UserController::class, 'uploadAvatar']);
    Route::delete('/user/avatar', [UserController::class, 'removeAvatar']);
    Route::patch('/user/preferences', [UserController::class, 'updatePreferences']);
    Route::get('/user/export', [UserController::class, 'exportData']);
    Route::post('/user/import', [ImportController::class, 'import']);
    Route::get('/user/import/sources', [ImportController::class, 'sources']);
    Route::delete('/user', [UserController::class, 'destroy']);

    Route::get('/user/opds', [UserController::class, 'getOpdsSettings']);
    Route::patch('/user/opds', [UserController::class, 'updateOpdsSettings']);
    Route::post('/user/opds/test', [UserController::class, 'testOpdsConnection']);
    Route::delete('/user/opds', [UserController::class, 'clearOpdsSettings']);

    Route::get('/books/search', [BookController::class, 'search']);
    Route::get('/books/editions', [BookController::class, 'editions']);
    Route::get('/books/classification-options', [BookController::class, 'classificationOptions']);
    Route::get('/books/{book}', [BookController::class, 'show']);
    Route::post('/books/{book}/classify', [BookController::class, 'classify']);

    Route::get('/library', [LibraryController::class, 'index']);
    Route::get('/library/external-ids', [LibraryController::class, 'externalIds']);
    Route::patch('/library/reorder', [LibraryController::class, 'reorder']);
    Route::get('/library/{userBook}', [LibraryController::class, 'show']);
    Route::patch('/library/{userBook}/pin', [LibraryController::class, 'pin']);
    Route::delete('/library/{userBook}/pin', [LibraryController::class, 'unpin']);
    Route::post('/library/{userBook}/reread', [LibraryController::class, 'startReread']);
    Route::get('/library/{userBook}/history', [LibraryController::class, 'readingHistory']);

    Route::get('/tags', [TagController::class, 'index']);
    Route::get('/tags/colors', [TagController::class, 'colors']);

    Route::get('/preferences', [UserPreferenceController::class, 'index']);
    Route::get('/preferences/list', [UserPreferenceController::class, 'list']);
    Route::get('/preferences/options', [UserPreferenceController::class, 'options']);
    Route::get('/preferences/genres', [UserPreferenceController::class, 'genres']);

    Route::get('/authors/library', [AuthorController::class, 'library']);
    Route::get('/authors/search', [AuthorController::class, 'search']);
    Route::get('/authors/{key}', [AuthorController::class, 'show']);
    Route::get('/authors/{key}/works', [AuthorController::class, 'works']);

    Route::get('/series', [SeriesController::class, 'index']);
    Route::post('/series', [SeriesController::class, 'store']);
    Route::get('/series/{series}', [SeriesController::class, 'show']);
    Route::patch('/series/{series}', [SeriesController::class, 'update']);
    Route::delete('/series/{series}', [SeriesController::class, 'destroy']);
    Route::post('/series/{series}/books', [SeriesController::class, 'assignBook']);
    Route::delete('/series/{series}/books', [SeriesController::class, 'removeBook']);

    Route::get('/sessions', [SessionController::class, 'index']);

    Route::get('/stats', [StatsController::class, 'index']);
    Route::get('/stats/heatmap', [StatsController::class, 'heatmap']);
    Route::get('/stats/format-velocity', [StatsController::class, 'formatVelocity']);
    Route::get('/stats/mood-ring', [StatsController::class, 'moodRing']);
    Route::get('/stats/dnf-analytics', [StatsController::class, 'dnfAnalytics']);
    Route::get('/stats/page-economy', [StatsController::class, 'pageEconomy']);
    Route::get('/stats/calendar', [StatsController::class, 'calendar']);

    Route::get('/goals', [ReadingGoalController::class, 'index']);
    Route::get('/goals/types', [ReadingGoalController::class, 'types']);
    Route::get('/goals/periods', [ReadingGoalController::class, 'periods']);
    Route::get('/goals/{goal}', [ReadingGoalController::class, 'show']);

    Route::prefix('sync')->group(function () {
        Route::get('/pull', [SyncController::class, 'pull']);
        Route::post('/push', [SyncController::class, 'push']);
        Route::post('/upload-cover', [SyncController::class, 'uploadCover']);
    });
});
