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
 * MasterBook model - unified book registry for discovery and user library.
 *
 * This replaces the separate books/catalog_books approach with a single
 * source of truth that grows as users add books.
 *
 * @property int $id
 * @property string|null $isbn13
 * @property string|null $isbn10
 * @property string $title
 * @property string|null $subtitle
 * @property string|null $author
 * @property string|null $description
 * @property int|null $page_count
 * @property \Carbon\Carbon|null $published_date
 * @property string|null $publisher
 * @property string $language
 * @property array|null $genres
 * @property array|null $subjects
 * @property string|null $series_name
 * @property int|null $series_position
 * @property string|null $cover_path
 * @property string|null $cover_url_external
 * @property \Carbon\Carbon|null $cover_fetched_at
 * @property string|null $google_books_id
 * @property string|null $open_library_key
 * @property string|null $goodreads_id
 * @property array $data_sources
 * @property float $completeness_score
 * @property \Carbon\Carbon|null $last_enriched_at
 * @property int $user_count
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
 * @property float $popularity_score
 * @property int $review_count
 * @property float|null $average_rating
 * @property bool $is_embedded
 * @property array|null $embedding
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class MasterBook extends Model
{
    use HasFactory;

    protected $table = 'master_books';

    protected function casts(): array
    {
        return [
            'genres' => 'array',
            'subjects' => 'array',
            'moods' => 'array',
            'data_sources' => 'array',
            'embedding' => 'array',
            'published_date' => 'date',
            'cover_fetched_at' => 'datetime',
            'last_enriched_at' => 'datetime',
            'classified_at' => 'datetime',
            'page_count' => 'integer',
            'series_position' => 'integer',
            'user_count' => 'integer',
            'review_count' => 'integer',
            'completeness_score' => 'float',
            'popularity_score' => 'float',
            'average_rating' => 'float',
            'classification_confidence' => 'float',
            'is_embedded' => 'boolean',
            'is_classified' => 'boolean',
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
     * Get all user signals for this master book.
     */
    public function signals(): HasMany
    {
        return $this->hasMany(UserSignal::class);
    }

    /**
     * Get all user books linked to this master book.
     */
    public function userBooks(): HasMany
    {
        return $this->hasMany(UserBook::class);
    }

    /**
     * Authors linked to this master book.
     */
    public function authors(): BelongsToMany
    {
        return $this->belongsToMany(Author::class, 'master_book_authors')
            ->withPivot('position')
            ->orderByPivot('position')
            ->withTimestamps();
    }

    /**
     * Genres linked to this master book.
     */
    public function genres(): BelongsToMany
    {
        return $this->belongsToMany(Genre::class, 'master_book_genres')
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
     * Get the best available cover URL (local preferred).
     */
    public function getCoverUrl(): ?string
    {
        if ($this->cover_path) {
            return asset('storage/covers/'.$this->cover_path);
        }

        return $this->cover_url_external;
    }

    /**
     * Calculate completeness score based on filled fields.
     */
    public function calculateCompleteness(): float
    {
        $fields = [
            'title' => 0.15,
            'author' => 0.15,
            'description' => 0.20,
            'cover_path' => 0.15,
            'page_count' => 0.05,
            'published_date' => 0.05,
            'genres' => 0.10,
            'is_classified' => 0.10,
            'is_embedded' => 0.05,
        ];

        $score = 0;
        foreach ($fields as $field => $weight) {
            $value = $this->$field;
            if (is_bool($value) ? $value : ! empty($value)) {
                $score += $weight;
            }
        }

        return round($score, 2);
    }

    /**
     * Add a data source to the tracking array.
     */
    public function addDataSource(string $source): void
    {
        $sources = $this->data_sources ?? [];
        if (! in_array($source, $sources)) {
            $sources[] = $source;
            $this->data_sources = $sources;
        }
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
     * Scope to search by title.
     */
    public function scopeSearchTitle($query, string $search)
    {
        return $query->where('title', 'ILIKE', '%'.$search.'%');
    }

    /**
     * Scope to search by title and author.
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('title', 'ILIKE', '%'.$search.'%')
                ->orWhere('author', 'ILIKE', '%'.$search.'%');
        });
    }

    /**
     * Scope to get books with minimum user count.
     */
    public function scopeMinUsers($query, int $count)
    {
        return $query->where('user_count', '>=', $count);
    }

    /**
     * Check if this book can be classified.
     */
    public function canClassify(): bool
    {
        return ! empty($this->description) && ! $this->is_classified;
    }

    /**
     * Check if this book needs enrichment.
     */
    public function needsEnrichment(): bool
    {
        return $this->completeness_score < 0.8
            || $this->last_enriched_at === null
            || $this->last_enriched_at->diffInDays(now()) > 30;
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
