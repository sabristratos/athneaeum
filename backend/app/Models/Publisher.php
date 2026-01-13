<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Represents a book publisher.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property int|null $parent_publisher_id
 * @property array|null $metadata
 */
class Publisher extends Model
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Publisher $publisher) {
            if (empty($publisher->slug)) {
                $publisher->slug = Str::slug($publisher->name);
            }
        });
    }

    /**
     * Books from this publisher.
     */
    public function books(): HasMany
    {
        return $this->hasMany(Book::class);
    }

    /**
     * Parent publisher (for imprints).
     */
    public function parentPublisher(): BelongsTo
    {
        return $this->belongsTo(Publisher::class, 'parent_publisher_id');
    }

    /**
     * Imprints of this publisher.
     */
    public function imprints(): HasMany
    {
        return $this->hasMany(Publisher::class, 'parent_publisher_id');
    }

    /**
     * Get book count for this publisher.
     */
    public function getBookCountAttribute(): int
    {
        return $this->books()->count();
    }
}
