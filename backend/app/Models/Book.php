<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Book model representing a book from an external API or manually added.
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
        ];
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
}
