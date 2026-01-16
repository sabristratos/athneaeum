<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tracks deleted records for sync purposes.
 *
 * When records are deleted via sync push, their IDs are logged here
 * so other devices can be informed of deletions during sync pull.
 */
class DeletionLog extends Model
{
    public $timestamps = false;

    protected $casts = [
        'deleted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Log a deletion for sync.
     */
    public static function logDeletion(int $userId, string $tableName, int $recordId): void
    {
        self::create([
            'user_id' => $userId,
            'table_name' => $tableName,
            'record_id' => $recordId,
            'deleted_at' => now(),
        ]);
    }

    /**
     * Get deleted record IDs for a user and table since a timestamp.
     *
     * @return array<int>
     */
    public static function getDeletedIds(int $userId, string $tableName, ?\Carbon\Carbon $since = null): array
    {
        return self::where('user_id', $userId)
            ->where('table_name', $tableName)
            ->when($since, fn ($q) => $q->where('deleted_at', '>', $since))
            ->pluck('record_id')
            ->toArray();
    }
}
