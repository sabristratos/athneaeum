<?php

declare(strict_types=1);

namespace App\Models;

use App\DTOs\Ingestion\VibeClassificationDTO;
use App\Enums\PlotArchetypeEnum;
use App\Enums\ProseStyleEnum;
use App\Enums\SettingAtmosphereEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * CatalogBook model for discovery recommendation catalog.
 *
 * This is separate from the user library books - it represents
 * the global catalog used for recommendations.
 *
 * @property int $id
 * @property string|null $external_id
 * @property string $external_provider
 * @property string $title
 * @property string|null $author
 * @property string|null $description
 * @property array|null $genres
 * @property int|null $page_count
 * @property \Carbon\Carbon|null $published_date
 * @property string|null $isbn
 * @property string|null $isbn13
 * @property string|null $cover_url
 * @property array|null $characters
 * @property string|null $series
 * @property int|null $series_position
 * @property string|null $format
 * @property array|null $embedding
 * @property float $popularity_score
 * @property int $review_count
 * @property float|null $average_rating
 * @property bool $is_embedded
 * @property string|null $audience
 * @property string|null $intensity
 * @property array|null $moods
 * @property float|null $classification_confidence
 * @property bool $is_classified
 * @property \Carbon\Carbon|null $classified_at
 * @property float|null $mood_darkness
 * @property float|null $pacing_speed
 * @property float|null $complexity_score
 * @property float|null $emotional_intensity
 * @property PlotArchetypeEnum|null $plot_archetype
 * @property ProseStyleEnum|null $prose_style
 * @property SettingAtmosphereEnum|null $setting_atmosphere
 * @property float|null $vibe_confidence
 * @property bool $is_vibe_classified
 * @property bool $is_nyt_bestseller
 * @property string|null $nyt_list_category
 * @property int|null $nyt_weeks_on_list
 * @property int|null $nyt_peak_rank
 * @property \Carbon\Carbon|null $nyt_first_seen_date
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class CatalogBook extends Model
{
    use HasFactory;

    protected $table = 'catalog_books';

    protected function casts(): array
    {
        return [
            'genres' => 'array',
            'characters' => 'array',
            'embedding' => 'array',
            'moods' => 'array',
            'published_date' => 'date',
            'page_count' => 'integer',
            'series_position' => 'integer',
            'popularity_score' => 'float',
            'review_count' => 'integer',
            'average_rating' => 'float',
            'classification_confidence' => 'float',
            'is_embedded' => 'boolean',
            'is_classified' => 'boolean',
            'classified_at' => 'datetime',
            'mood_darkness' => 'float',
            'pacing_speed' => 'float',
            'complexity_score' => 'float',
            'emotional_intensity' => 'float',
            'plot_archetype' => PlotArchetypeEnum::class,
            'prose_style' => ProseStyleEnum::class,
            'setting_atmosphere' => SettingAtmosphereEnum::class,
            'vibe_confidence' => 'float',
            'is_vibe_classified' => 'boolean',
            'is_nyt_bestseller' => 'boolean',
            'nyt_weeks_on_list' => 'integer',
            'nyt_peak_rank' => 'integer',
            'nyt_first_seen_date' => 'date',
        ];
    }

    /**
     * Get all user signals for this catalog book.
     */
    public function signals(): HasMany
    {
        return $this->hasMany(UserSignal::class);
    }

    /**
     * Authors linked to this catalog book.
     */
    public function authors(): BelongsToMany
    {
        return $this->belongsToMany(Author::class, 'catalog_book_authors')
            ->withPivot('position')
            ->orderByPivot('position')
            ->withTimestamps();
    }

    /**
     * Genres linked to this catalog book.
     */
    public function genres(): BelongsToMany
    {
        return $this->belongsToMany(Genre::class, 'catalog_book_genres')
            ->withPivot('is_primary')
            ->orderByPivot('is_primary', 'desc')
            ->withTimestamps();
    }

    /**
     * Get the primary author (position 1).
     */
    public function primaryAuthor(): ?Author
    {
        return $this->authors()->wherePivot('position', 1)->first();
    }

    /**
     * Get the primary genre.
     */
    public function primaryGenre(): ?Genre
    {
        return $this->genres()->wherePivot('is_primary', true)->first();
    }

    /**
     * Scope to get books that need embedding generation.
     */
    public function scopePendingEmbedding($query)
    {
        return $query->where('is_embedded', false);
    }

    /**
     * Scope to get books ordered by popularity.
     */
    public function scopePopular($query)
    {
        return $query->orderByDesc('popularity_score');
    }

    /**
     * Scope to get books with embeddings for similarity queries.
     */
    public function scopeWithEmbedding($query)
    {
        return $query->whereNotNull('embedding');
    }

    /**
     * Scope to get books that need classification.
     */
    public function scopePendingClassification($query)
    {
        return $query->where('is_classified', false)
            ->whereNotNull('description')
            ->where('description', '!=', '');
    }

    /**
     * Scope to get classified books.
     */
    public function scopeClassified($query)
    {
        return $query->where('is_classified', true);
    }

    /**
     * Scope to filter by audience.
     */
    public function scopeForAudience($query, string $audience)
    {
        return $query->where('audience', $audience);
    }

    /**
     * Scope to filter by intensity.
     */
    public function scopeForIntensity($query, string $intensity)
    {
        return $query->where('intensity', $intensity);
    }

    /**
     * Check if this book can be classified.
     */
    public function canClassify(): bool
    {
        return ! empty($this->description) && ! $this->is_classified;
    }

    /**
     * Check if this book needs classification.
     */
    public function needsClassification(): bool
    {
        return ! empty($this->description) && ! $this->is_classified;
    }

    /**
     * Check if this book needs vibe classification.
     */
    public function needsVibeClassification(): bool
    {
        return ! empty($this->description) && ! $this->is_vibe_classified;
    }

    /**
     * Scope to get books that need vibe classification.
     */
    public function scopePendingVibeClassification($query)
    {
        return $query->where('is_vibe_classified', false)
            ->whereNotNull('description')
            ->where('description', '!=', '');
    }

    /**
     * Scope to get books that have vibe classification.
     */
    public function scopeVibeClassified($query)
    {
        return $query->where('is_vibe_classified', true);
    }

    /**
     * Scope to get NYT bestsellers.
     */
    public function scopeNytBestseller($query)
    {
        return $query->where('is_nyt_bestseller', true);
    }

    /**
     * Scope to filter by NYT list category.
     */
    public function scopeNytCategory($query, string $category)
    {
        return $query->where('nyt_list_category', $category);
    }

    /**
     * Get the vibe classification DTO.
     */
    public function getVibeClassification(): VibeClassificationDTO
    {
        return new VibeClassificationDTO(
            moodDarkness: $this->mood_darkness,
            pacingSpeed: $this->pacing_speed,
            complexityScore: $this->complexity_score,
            emotionalIntensity: $this->emotional_intensity,
            plotArchetype: $this->plot_archetype,
            proseStyle: $this->prose_style,
            settingAtmosphere: $this->setting_atmosphere,
            confidence: $this->vibe_confidence ?? 0.0,
        );
    }

    /**
     * Apply vibe classification to this book.
     */
    public function applyVibeClassification(VibeClassificationDTO $vibes): void
    {
        $this->mood_darkness = $vibes->moodDarkness;
        $this->pacing_speed = $vibes->pacingSpeed;
        $this->complexity_score = $vibes->complexityScore;
        $this->emotional_intensity = $vibes->emotionalIntensity;
        $this->plot_archetype = $vibes->plotArchetype;
        $this->prose_style = $vibes->proseStyle;
        $this->setting_atmosphere = $vibes->settingAtmosphere;
        $this->vibe_confidence = $vibes->confidence;
        $this->is_vibe_classified = $vibes->confidence > 0;
    }
}
