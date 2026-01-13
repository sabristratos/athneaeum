<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ReadingSession model representing a single reading session logged by a user.
 */
class ReadingSession extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'pages_read' => 'integer',
            'start_page' => 'integer',
            'end_page' => 'integer',
            'duration_seconds' => 'integer',
        ];
    }

    /**
     * Get the user book this session belongs to.
     */
    public function userBook(): BelongsTo
    {
        return $this->belongsTo(UserBook::class);
    }

    /**
     * Get the read-through this session belongs to (optional for backward compatibility).
     */
    public function readThrough(): BelongsTo
    {
        return $this->belongsTo(ReadThrough::class);
    }

    /**
     * Get formatted duration string.
     */
    protected function formattedDuration(): Attribute
    {
        return Attribute::get(function (): ?string {
            if (! $this->duration_seconds) {
                return null;
            }

            $hours = (int) floor($this->duration_seconds / 3600);
            $minutes = (int) floor(($this->duration_seconds % 3600) / 60);

            if ($hours > 0) {
                return sprintf('%dh %dm', $hours, $minutes);
            }

            return sprintf('%dm', $minutes);
        });
    }
}
