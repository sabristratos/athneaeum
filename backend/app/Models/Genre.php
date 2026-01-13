<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\GenreEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Represents a book genre with taxonomy support.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property int|null $parent_id
 * @property string $canonical_value
 * @property string|null $description
 * @property int $sort_order
 */
class Genre extends Model
{
    protected static function booted(): void
    {
        static::creating(function (Genre $genre) {
            if (empty($genre->slug)) {
                $genre->slug = Str::slug($genre->name);
            }
        });
    }

    /**
     * Parent genre in taxonomy.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Genre::class, 'parent_id');
    }

    /**
     * Child genres in taxonomy.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Genre::class, 'parent_id');
    }

    /**
     * Books in this genre.
     */
    public function books(): BelongsToMany
    {
        return $this->belongsToMany(Book::class, 'book_genre')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    /**
     * External genre mappings that resolve to this genre.
     */
    public function mappings(): HasMany
    {
        return $this->hasMany(GenreMapping::class);
    }

    /**
     * Get the GenreEnum value.
     */
    public function getCanonicalEnum(): ?GenreEnum
    {
        return GenreEnum::tryFrom($this->canonical_value);
    }

    /**
     * Get the category from GenreEnum.
     */
    public function getCategoryAttribute(): ?string
    {
        $enum = $this->getCanonicalEnum();

        return $enum?->category();
    }

    /**
     * Get display label from GenreEnum.
     */
    public function getLabelAttribute(): string
    {
        $enum = $this->getCanonicalEnum();

        return $enum?->label() ?? $this->name;
    }

    /**
     * Get book count for this genre.
     */
    public function getBookCountAttribute(): int
    {
        return $this->books()->count();
    }

    /**
     * Scope to filter by category.
     */
    public function scopeCategory($query, string $category)
    {
        $values = collect(GenreEnum::cases())
            ->filter(fn (GenreEnum $g) => $g->category() === $category)
            ->map(fn (GenreEnum $g) => $g->value)
            ->toArray();

        return $query->whereIn('canonical_value', $values);
    }
}
