<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BookFormatEnum;
use App\Enums\BookStatusEnum;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
            'format' => BookFormatEnum::class,
            'rating' => 'decimal:2',
            'price' => 'decimal:2',
            'current_page' => 'integer',
            'is_dnf' => 'boolean',
            'is_pinned' => 'boolean',
            'queue_position' => 'integer',
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
     * Get all read-throughs for this user book.
     */
    public function readThroughs(): HasMany
    {
        return $this->hasMany(ReadThrough::class)->orderBy('read_number');
    }

    /**
     * Get the current (most recent) read-through.
     */
    public function currentReadThrough(): HasOne
    {
        return $this->hasOne(ReadThrough::class)->latestOfMany('read_number');
    }

    /**
     * Get the count of times this book has been read.
     */
    public function getReadCountAttribute(): int
    {
        return $this->readThroughs()
            ->where('status', BookStatusEnum::Read->value)
            ->count();
    }

    /**
     * Start a re-read of this book.
     */
    public function startReread(): ReadThrough
    {
        $nextReadNumber = ($this->readThroughs()->max('read_number') ?? 0) + 1;

        $readThrough = ReadThrough::create([
            'user_book_id' => $this->id,
            'read_number' => $nextReadNumber,
            'status' => BookStatusEnum::Reading->value,
            'started_at' => now(),
        ]);

        $this->update([
            'status' => BookStatusEnum::Reading->value,
            'started_at' => now(),
            'finished_at' => null,
            'current_page' => 0,
        ]);

        return $readThrough;
    }

    /**
     * Get the tags for this user book.
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'user_book_tag')
            ->withTimestamps();
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

    /**
     * Scope to filter by pinned status.
     */
    public function scopePinned($query)
    {
        return $query->where('is_pinned', true);
    }

    /**
     * Scope to order by queue position.
     */
    public function scopeOrdered($query)
    {
        return $query->orderByRaw('COALESCE(queue_position, 999999) ASC');
    }
}
