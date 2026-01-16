<?php

declare(strict_types=1);

namespace App\Models;

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
}
