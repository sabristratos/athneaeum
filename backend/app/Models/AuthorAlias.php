<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Stores author name aliases (pen names, variants, typos).
 *
 * This is part of the Level 2 (LLM) decision cache - once an
 * alias is learned, it's stored here permanently.
 *
 * @property int $id
 * @property string $alias
 * @property string $normalized_alias
 * @property int $author_id
 * @property string $alias_type
 * @property string $source
 * @property bool $verified
 */
class AuthorAlias extends Model
{
    /**
     * Alias types.
     */
    public const TYPE_PEN_NAME = 'pen_name';

    public const TYPE_VARIANT = 'variant';

    public const TYPE_TYPO = 'typo';

    public const TYPE_TRANSLITERATION = 'transliteration';

    protected function casts(): array
    {
        return [
            'verified' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (AuthorAlias $alias) {
            if (empty($alias->normalized_alias)) {
                $alias->normalized_alias = Str::slug($alias->alias);
            }
        });
    }

    /**
     * The canonical author this alias points to.
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(Author::class);
    }

    /**
     * Find a canonical author by alias.
     */
    public static function findAuthorByAlias(string $alias): ?Author
    {
        $normalized = Str::slug($alias);

        $record = self::where('normalized_alias', $normalized)->first();

        return $record?->author;
    }

    /**
     * Create or update an alias.
     */
    public static function learnAlias(
        string $alias,
        Author $author,
        string $type = self::TYPE_VARIANT,
        string $source = 'manual',
        bool $verified = false
    ): self {
        $normalized = Str::slug($alias);

        return self::updateOrCreate(
            ['normalized_alias' => $normalized],
            [
                'alias' => $alias,
                'author_id' => $author->id,
                'alias_type' => $type,
                'source' => $source,
                'verified' => $verified,
            ]
        );
    }

    /**
     * Scope to filter by alias type.
     */
    public function scopeType($query, string $type)
    {
        return $query->where('alias_type', $type);
    }

    /**
     * Scope to filter by source.
     */
    public function scopeSource($query, string $source)
    {
        return $query->where('source', $source);
    }

    /**
     * Scope to filter by verified status.
     */
    public function scopeVerified($query, bool $verified = true)
    {
        return $query->where('verified', $verified);
    }
}
