<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ThemeEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'theme' => ThemeEnum::class,
            'preferences' => 'array',
        ];
    }

    /**
     * Get the books in this user's library.
     */
    public function books(): BelongsToMany
    {
        return $this->belongsToMany(Book::class, 'user_books')
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
     * Get all user book entries for this user.
     */
    public function userBooks(): HasMany
    {
        return $this->hasMany(UserBook::class);
    }
}
