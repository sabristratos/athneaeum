<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Caches external genre to canonical genre mappings.
 *
 * This is the Level 2 (LLM) decision cache - once a genre
 * mapping is learned, it's stored here permanently.
 *
 * @property int $id
 * @property string $external_genre
 * @property string $normalized_external
 * @property int|null $genre_id
 * @property string $source
 * @property float $confidence
 * @property bool $verified
 */
class GenreMapping extends Model
{
    protected function casts(): array
    {
        return [
            'confidence' => 'float',
            'verified' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (GenreMapping $mapping) {
            if (empty($mapping->normalized_external)) {
                $mapping->normalized_external = strtolower(trim($mapping->external_genre));
            }
        });
    }

    /**
     * The canonical genre this maps to.
     */
    public function genre(): BelongsTo
    {
        return $this->belongsTo(Genre::class);
    }

    /**
     * Find a cached mapping by external genre and source.
     */
    public static function findMapping(string $externalGenre, string $source): ?self
    {
        $normalized = strtolower(trim($externalGenre));

        return self::where('normalized_external', $normalized)
            ->where('source', $source)
            ->first();
    }

    /**
     * Create or update a mapping.
     */
    public static function learnMapping(
        string $externalGenre,
        ?Genre $genre,
        string $source,
        float $confidence = 1.0,
        bool $verified = false
    ): self {
        $normalized = strtolower(trim($externalGenre));

        return self::updateOrCreate(
            [
                'normalized_external' => $normalized,
                'source' => $source,
            ],
            [
                'external_genre' => $externalGenre,
                'genre_id' => $genre?->id,
                'confidence' => $confidence,
                'verified' => $verified,
            ]
        );
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

    /**
     * Scope to get unmapped genres (no genre_id).
     */
    public function scopeUnmapped($query)
    {
        return $query->whereNull('genre_id');
    }
}
