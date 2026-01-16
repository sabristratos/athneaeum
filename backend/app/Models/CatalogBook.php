<?php

declare(strict_types=1);

namespace App\Models;

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
     * Build the text used for generating embeddings.
     */
    public function buildEmbeddingText(): string
    {
        $parts = array_filter([
            $this->title,
            $this->author,
            $this->description,
            is_array($this->genres) ? implode(', ', $this->genres) : null,
        ]);

        return implode(' | ', $parts);
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
}
