<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PreferenceCategoryEnum;
use App\Enums\PreferenceTypeEnum;
use App\Enums\SearchSourceEnum;
use App\Enums\ThemeEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $hidden = [
        'password',
        'remember_token',
        'opds_password',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'onboarded_at' => 'datetime',
            'password' => 'hashed',
            'theme' => ThemeEnum::class,
            'preferences' => 'array',
            'opds_password' => 'encrypted',
            'preferred_search_source' => SearchSourceEnum::class,
        ];
    }

    /**
     * Check if user has OPDS configured.
     */
    public function hasOpdsConfigured(): bool
    {
        return ! empty($this->opds_server_url);
    }

    /**
     * Get the decrypted OPDS password.
     */
    public function getOpdsPasswordDecrypted(): ?string
    {
        return $this->opds_password;
    }

    /**
     * Get the books in this user's library.
     */
    public function books(): BelongsToMany
    {
        return $this->belongsToMany(Book::class, 'user_books')
            ->withPivot([
                'id',
                'status',
                'rating',
                'current_page',
                'is_dnf',
                'dnf_reason',
                'started_at',
                'finished_at',
            ])
            ->withTimestamps();
    }

    /**
     * Get all user book entries for this user.
     */
    public function userBooks(): HasMany
    {
        return $this->hasMany(UserBook::class);
    }

    /**
     * Get the user's aggregated statistics.
     */
    public function statistics(): HasOne
    {
        return $this->hasOne(UserStatistics::class);
    }

    /**
     * Get the user's monthly statistics archive.
     */
    public function statisticsMonthly(): HasMany
    {
        return $this->hasMany(UserStatisticsMonthly::class);
    }

    /**
     * Get the user's reading goals.
     */
    public function readingGoals(): HasMany
    {
        return $this->hasMany(ReadingGoal::class);
    }

    /**
     * Get or create the user's statistics record.
     */
    public function getOrCreateStatistics(): UserStatistics
    {
        return $this->statistics ?? $this->statistics()->create([]);
    }

    /**
     * Get all user preferences (favorites and excludes).
     */
    public function userPreferences(): HasMany
    {
        return $this->hasMany(UserPreference::class);
    }

    /**
     * Get favorite authors.
     */
    public function favoriteAuthors(): HasMany
    {
        return $this->userPreferences()
            ->where('category', PreferenceCategoryEnum::Author)
            ->where('type', PreferenceTypeEnum::Favorite);
    }

    /**
     * Get excluded authors.
     */
    public function excludedAuthors(): HasMany
    {
        return $this->userPreferences()
            ->where('category', PreferenceCategoryEnum::Author)
            ->where('type', PreferenceTypeEnum::Exclude);
    }

    /**
     * Get favorite genres.
     */
    public function favoriteGenres(): HasMany
    {
        return $this->userPreferences()
            ->where('category', PreferenceCategoryEnum::Genre)
            ->where('type', PreferenceTypeEnum::Favorite);
    }

    /**
     * Get excluded genres.
     */
    public function excludedGenres(): HasMany
    {
        return $this->userPreferences()
            ->where('category', PreferenceCategoryEnum::Genre)
            ->where('type', PreferenceTypeEnum::Exclude);
    }

    /**
     * Get favorite series.
     */
    public function favoriteSeries(): HasMany
    {
        return $this->userPreferences()
            ->where('category', PreferenceCategoryEnum::Series)
            ->where('type', PreferenceTypeEnum::Favorite);
    }

    /**
     * Get excluded series.
     */
    public function excludedSeries(): HasMany
    {
        return $this->userPreferences()
            ->where('category', PreferenceCategoryEnum::Series)
            ->where('type', PreferenceTypeEnum::Exclude);
    }

    /**
     * Get all preferences grouped by type and category.
     *
     * @return array{favorites: array<string, array<string>>, excludes: array<string, array<string>>}
     */
    public function getGroupedPreferences(): array
    {
        $preferences = $this->userPreferences()->get();

        $grouped = [
            'favorites' => [
                'authors' => [],
                'genres' => [],
                'series' => [],
            ],
            'excludes' => [
                'authors' => [],
                'genres' => [],
                'series' => [],
            ],
        ];

        foreach ($preferences as $pref) {
            $typeKey = $pref->type === PreferenceTypeEnum::Favorite ? 'favorites' : 'excludes';
            $categoryKey = match ($pref->category) {
                PreferenceCategoryEnum::Author => 'authors',
                PreferenceCategoryEnum::Genre => 'genres',
                PreferenceCategoryEnum::Series => 'series',
            };
            $grouped[$typeKey][$categoryKey][] = $pref->value;
        }

        return $grouped;
    }
}
