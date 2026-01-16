<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * UserEmbedding model for caching computed user preference vectors.
 *
 * The embedding is an average of the user's recently read books' embeddings,
 * used for personalized recommendation queries.
 *
 * @property int $id
 * @property int $user_id
 * @property array|null $embedding
 * @property array|null $computed_from
 * @property \Carbon\Carbon|null $computed_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class UserEmbedding extends Model
{
    protected $table = 'user_embeddings';

    protected function casts(): array
    {
        return [
            'embedding' => 'array',
            'computed_from' => 'array',
            'computed_at' => 'datetime',
        ];
    }

    /**
     * Get the user this embedding belongs to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the embedding is stale and needs recomputation.
     *
     * An embedding is considered stale if:
     * - It was computed more than 24 hours ago
     * - The user has finished a book since computation
     */
    public function isStale(): bool
    {
        if (! $this->computed_at) {
            return true;
        }

        return $this->computed_at->diffInHours(now()) > 24;
    }

    /**
     * Check if the embedding has valid data.
     */
    public function hasEmbedding(): bool
    {
        return is_array($this->embedding) && count($this->embedding) > 0;
    }
}
