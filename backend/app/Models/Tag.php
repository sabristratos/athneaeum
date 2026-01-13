<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TagColorEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

/**
 * Tag model for categorizing books in user libraries.
 */
class Tag extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'color' => TagColorEnum::class,
            'is_system' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Tag $tag): void {
            if (empty($tag->slug)) {
                $tag->slug = Str::slug($tag->name);
            }
        });

        static::updating(function (Tag $tag): void {
            if ($tag->isDirty('name') && ! $tag->isDirty('slug')) {
                $tag->slug = Str::slug($tag->name);
            }
        });
    }

    /**
     * Get the user that owns this tag (null for system tags).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all user books that have this tag.
     */
    public function userBooks(): BelongsToMany
    {
        return $this->belongsToMany(UserBook::class, 'user_book_tag')
            ->withTimestamps();
    }

    /**
     * Scope to get tags available for a specific user (system + their own).
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('is_system', true)
                ->orWhere('user_id', $userId);
        });
    }

    /**
     * Scope to get only system tags.
     */
    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    /**
     * Scope to get only user-created tags.
     */
    public function scopeUserCreated($query)
    {
        return $query->where('is_system', false);
    }
}
