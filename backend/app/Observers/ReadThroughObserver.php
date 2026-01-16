<?php

declare(strict_types=1);

namespace App\Observers;

use App\Enums\BookStatusEnum;
use App\Models\ReadThrough;

/**
 * Observer for read-through changes.
 *
 * Keeps UserBook status and rating in sync with the current ReadThrough.
 */
class ReadThroughObserver
{
    /**
     * Handle the ReadThrough "created" event.
     */
    public function created(ReadThrough $readThrough): void
    {
        if ($readThrough->read_number > 1) {
            $readThrough->userBook->updateQuietly([
                'status' => BookStatusEnum::Reading->value,
                'started_at' => $readThrough->started_at ?? now(),
                'finished_at' => null,
            ]);
        }
    }

    /**
     * Handle the ReadThrough "updated" event.
     */
    public function updated(ReadThrough $readThrough): void
    {
        $userBook = $readThrough->userBook;

        if ($readThrough->wasChanged('status')) {
            $userBook->updateQuietly([
                'status' => $readThrough->status->value,
            ]);

            if ($readThrough->status === BookStatusEnum::Read && ! $userBook->finished_at) {
                $userBook->updateQuietly([
                    'finished_at' => $readThrough->finished_at ?? now(),
                ]);
            }
        }

        if ($readThrough->wasChanged('rating') && $readThrough->isComplete()) {
            $userBook->updateQuietly([
                'rating' => $readThrough->rating,
            ]);
        }

        if ($readThrough->wasChanged('is_dnf') && $readThrough->is_dnf) {
            $userBook->updateQuietly([
                'is_dnf' => true,
                'dnf_reason' => $readThrough->dnf_reason,
            ]);
        }

        if ($readThrough->wasChanged('started_at')) {
            $userBook->updateQuietly([
                'started_at' => $readThrough->started_at,
            ]);
        }

        if ($readThrough->wasChanged('finished_at')) {
            $userBook->updateQuietly([
                'finished_at' => $readThrough->finished_at,
            ]);
        }
    }
}
