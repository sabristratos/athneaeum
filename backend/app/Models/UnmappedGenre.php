<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Tracks unmapped genre strings from catalog ingestion.
 *
 * Used to identify gaps in genre mapping configuration
 * and prioritize which mappings to add based on occurrence count.
 *
 * @property int $id
 * @property string $raw_genre
 * @property int $occurrence_count
 * @property string|null $suggested_mapping
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class UnmappedGenre extends Model
{
    protected $table = 'unmapped_genres';

    protected function casts(): array
    {
        return [
            'occurrence_count' => 'integer',
        ];
    }

    /**
     * Increment the occurrence count for a raw genre string.
     */
    public static function track(string $rawGenre): void
    {
        static::updateOrCreate(
            ['raw_genre' => $rawGenre],
            []
        )->increment('occurrence_count');
    }

    /**
     * Scope to order by most common unmapped genres.
     */
    public function scopeMostCommon($query)
    {
        return $query->orderByDesc('occurrence_count');
    }

    /**
     * Scope to get unmapped genres without suggested mapping.
     */
    public function scopeNeedsSuggestion($query)
    {
        return $query->whereNull('suggested_mapping');
    }
}
