<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BookStatusEnum;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * UserBook model representing a user's relationship with a book in their library.
 */
class UserBook extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => BookStatusEnum::class,
            'rating' => 'decimal:2',
            'current_page' => 'integer',
            'is_dnf' => 'boolean',
            'started_at' => 'date',
            'finished_at' => 'date',
        ];
    }

    /**
     * Get the user that owns this library entry.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the book for this library entry.
     */
    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    /**
     * Get the reading sessions for this user book.
     */
    public function readingSessions(): HasMany
    {
        return $this->hasMany(ReadingSession::class);
    }

    /**
     * Calculate progress percentage based on current page and book page count.
     */
    protected function progressPercentage(): Attribute
    {
        return Attribute::get(function (): ?float {
            if (! $this->book?->page_count || $this->book->page_count === 0) {
                return null;
            }

            return round(($this->current_page / $this->book->page_count) * 100, 1);
        });
    }
}
