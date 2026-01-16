<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * UserSignal model for tracking user interactions with catalog books.
 *
 * Signals are used to improve recommendations over time by learning
 * from user behavior (views, clicks, adds to library, dismissals).
 *
 * @property int $id
 * @property int $user_id
 * @property int $catalog_book_id
 * @property string $signal_type
 * @property float $weight
 * @property \Carbon\Carbon $created_at
 */
class UserSignal extends Model
{
    public $timestamps = false;

    protected $table = 'user_signals';

    protected function casts(): array
    {
        return [
            'weight' => 'float',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Get the user who generated this signal.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the catalog book this signal is for.
     */
    public function catalogBook(): BelongsTo
    {
        return $this->belongsTo(CatalogBook::class);
    }

    /**
     * Scope to get signals for a specific user.
     */
    public function scopeForUser($query, User $user)
    {
        return $query->where('user_id', $user->id);
    }

    /**
     * Scope to get signals of a specific type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('signal_type', $type);
    }

    /**
     * Scope to get signals within a date range.
     */
    public function scopeWithinDays($query, int $days)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}
