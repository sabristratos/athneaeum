<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Series model representing a book series.
 */
class Series extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'total_volumes' => 'integer',
            'is_complete' => 'boolean',
        ];
    }

    /**
     * Get all books in this series.
     */
    public function books(): HasMany
    {
        return $this->hasMany(Book::class)->orderBy('volume_number');
    }

    /**
     * Get the count of books in this series.
     */
    public function getBookCountAttribute(): int
    {
        return $this->books()->count();
    }

    /**
     * Find or create a series from external data.
     */
    public static function findOrCreateFromExternal(
        string $title,
        string $author,
        ?string $externalId = null,
        ?string $externalProvider = null
    ): self {
        return self::firstOrCreate(
            ['title' => $title, 'author' => $author],
            [
                'external_id' => $externalId,
                'external_provider' => $externalProvider,
            ]
        );
    }
}
