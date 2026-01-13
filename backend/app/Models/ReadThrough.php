<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BookStatusEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * ReadThrough model representing a single "reading" of a book.
 * A user can have multiple read-throughs for the same book (re-reads).
 */
class ReadThrough extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'read_number' => 'integer',
            'started_at' => 'date',
            'finished_at' => 'date',
            'rating' => 'decimal:2',
            'status' => BookStatusEnum::class,
            'is_dnf' => 'boolean',
        ];
    }

    /**
     * Get the user book this read-through belongs to.
     */
    public function userBook(): BelongsTo
    {
        return $this->belongsTo(UserBook::class);
    }

    /**
     * Get the reading sessions for this read-through.
     */
    public function readingSessions(): HasMany
    {
        return $this->hasMany(ReadingSession::class);
    }

    /**
     * Check if this read-through is complete.
     */
    public function isComplete(): bool
    {
        return $this->status === BookStatusEnum::Read;
    }

    /**
     * Check if this read-through was abandoned.
     */
    public function isDnf(): bool
    {
        return $this->is_dnf || $this->status === BookStatusEnum::Dnf;
    }

    /**
     * Calculate total pages read in this read-through.
     */
    public function getTotalPagesReadAttribute(): int
    {
        return $this->readingSessions()->sum('pages_read');
    }

    /**
     * Calculate total reading time in seconds for this read-through.
     */
    public function getTotalReadingSecondsAttribute(): int
    {
        return (int) $this->readingSessions()->sum('duration_seconds');
    }

    /**
     * Scope for active (in-progress) read-throughs.
     */
    public function scopeActive($query)
    {
        return $query->where('status', BookStatusEnum::Reading->value);
    }

    /**
     * Scope for completed read-throughs.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', BookStatusEnum::Read->value);
    }
}
