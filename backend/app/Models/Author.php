<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Represents a book author with normalized data.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $sort_name
 * @property array|null $metadata
 * @property string|null $external_id
 * @property string|null $external_provider
 * @property bool $is_merged
 * @property int|null $canonical_author_id
 */
class Author extends Model
{
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'is_merged' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Author $author) {
            if (empty($author->slug)) {
                $author->slug = Str::slug($author->name);
            }
            if (empty($author->sort_name)) {
                $author->sort_name = self::generateSortName($author->name);
            }
        });
    }

    /**
     * Books by this author.
     */
    public function books(): BelongsToMany
    {
        return $this->belongsToMany(Book::class, 'book_author')
            ->withPivot(['role', 'position'])
            ->orderByPivot('position')
            ->withTimestamps();
    }

    /**
     * Known aliases for this author.
     */
    public function aliases(): HasMany
    {
        return $this->hasMany(AuthorAlias::class);
    }

    /**
     * The canonical author if this is a merged duplicate.
     */
    public function canonicalAuthor(): BelongsTo
    {
        return $this->belongsTo(Author::class, 'canonical_author_id');
    }

    /**
     * Authors that were merged into this one.
     */
    public function mergedAuthors(): HasMany
    {
        return $this->hasMany(Author::class, 'canonical_author_id');
    }

    /**
     * Get the effective author (canonical if merged).
     */
    public function getEffectiveAuthor(): self
    {
        if ($this->is_merged && $this->canonicalAuthor) {
            return $this->canonicalAuthor;
        }

        return $this;
    }

    /**
     * Generate sort name from display name.
     * "J.K. Rowling" -> "Rowling, J.K."
     */
    public static function generateSortName(string $name): string
    {
        $parts = explode(' ', $name);

        if (count($parts) <= 1) {
            return $name;
        }

        $lastName = array_pop($parts);

        $particles = ['von', 'van', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'du', 'des'];
        if (count($parts) > 0 && in_array(strtolower(end($parts)), $particles, true)) {
            $particle = array_pop($parts);
            $lastName = $particle.' '.$lastName;
        }

        return $lastName.', '.implode(' ', $parts);
    }

    /**
     * Get book count for this author.
     */
    public function getBookCountAttribute(): int
    {
        return $this->books()->count();
    }
}
