<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PreferenceCategoryEnum;
use App\Enums\PreferenceTypeEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * User preference for favorites and excludes (authors, genres, series).
 */
class UserPreference extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'category' => PreferenceCategoryEnum::class,
            'type' => PreferenceTypeEnum::class,
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (UserPreference $preference) {
            $preference->normalized = strtolower(trim($preference->value));
        });
    }

    /**
     * Get the user that owns this preference.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if a given value matches this preference (case-insensitive).
     */
    public function matches(string $value): bool
    {
        return $this->normalized === strtolower(trim($value));
    }

    /**
     * Check if any item in an array matches this preference.
     *
     * @param  array<string>  $values
     */
    public function matchesAny(array $values): bool
    {
        $normalized = array_map(fn ($v) => strtolower(trim($v)), $values);

        return in_array($this->normalized, $normalized, true);
    }
}
