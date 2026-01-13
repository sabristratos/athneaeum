<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Book model representing a book from an external API or manually added.
 *
 * @property int $id
 * @property string $title
 * @property string $author
 * @property string|null $description
 * @property array|null $genres
 * @property string|null $isbn
 * @property string|null $isbn13
 * @property int|null $page_count
 * @property \Carbon\Carbon|null $published_date
 * @property int|null $publisher_id
 * @property bool $is_locked
 * @property int|null $series_id
 * @property int|null $volume_number
 */
class Book extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'genres' => 'array',
            'published_date' => 'date',
            'page_count' => 'integer',
            'height_cm' => 'decimal:2',
            'width_cm' => 'decimal:2',
            'thickness_cm' => 'decimal:2',
            'volume_number' => 'integer',
            'is_locked' => 'boolean',
            'audience' => AudienceEnum::class,
            'intensity' => ContentIntensityEnum::class,
            'moods' => 'array',
            'classification_confidence' => 'float',
            'is_classified' => 'boolean',
        ];
    }

    /**
     * Get the series this book belongs to.
     */
    public function series(): BelongsTo
    {
        return $this->belongsTo(Series::class);
    }

    /**
     * Get the publisher of this book.
     */
    public function publisher(): BelongsTo
    {
        return $this->belongsTo(Publisher::class);
    }

    /**
     * Get the authors of this book (normalized relationship).
     */
    public function authors(): BelongsToMany
    {
        return $this->belongsToMany(Author::class, 'book_author')
            ->withPivot(['role', 'position'])
            ->orderByPivot('position')
            ->withTimestamps();
    }

    /**
     * Get the genres of this book (normalized relationship).
     */
    public function genreRelations(): BelongsToMany
    {
        return $this->belongsToMany(Genre::class, 'book_genre')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    /**
     * Get the users who have this book in their library.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_books')
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
     * Get all user book entries for this book.
     */
    public function userBooks(): HasMany
    {
        return $this->hasMany(UserBook::class);
    }

    /**
     * Get the primary author.
     * Falls back to the denormalized author string if no authors relationship.
     */
    public function getPrimaryAuthorAttribute(): ?Author
    {
        return $this->authors->first();
    }

    /**
     * Get the primary genre.
     */
    public function getPrimaryGenreAttribute(): ?Genre
    {
        return $this->genreRelations->where('pivot.is_primary', true)->first()
            ?? $this->genreRelations->first();
    }

    /**
     * Get author name as string (backward compatible).
     * Uses normalized authors if available, falls back to denormalized column.
     */
    public function getAuthorDisplayAttribute(): string
    {
        if ($this->relationLoaded('authors') && $this->authors->isNotEmpty()) {
            return $this->authors
                ->where('pivot.role', 'author')
                ->pluck('name')
                ->join(', ') ?: $this->authors->pluck('name')->join(', ');
        }

        return $this->attributes['author'] ?? 'Unknown Author';
    }

    /**
     * Check if this book can be updated from external source.
     */
    public function canUpdateFromExternal(): bool
    {
        return ! $this->is_locked;
    }

    /**
     * Lock this book from external updates.
     */
    public function lock(): void
    {
        $this->update(['is_locked' => true]);
    }

    /**
     * Unlock this book for external updates.
     */
    public function unlock(): void
    {
        $this->update(['is_locked' => false]);
    }
}
