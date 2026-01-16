<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Contracts\MediaStorageServiceInterface;
use App\Models\Author;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;

/**
 * Downloads and stores author photos locally.
 *
 * Fetches the photo from Open Library (or other source) and stores it
 * on the server for reliable, fast serving.
 */
class EnrichAuthorPhotoJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $backoff = 30;

    public function __construct(
        public int $authorId
    ) {}

    public function middleware(): array
    {
        return [new RateLimited('openlibrary-api')];
    }

    public function handle(MediaStorageServiceInterface $mediaStorage): void
    {
        $author = Author::find($this->authorId);

        if (! $author) {
            return;
        }

        if (! empty($author->photo_path)) {
            return;
        }

        $photoUrl = $author->photo_url ?? $author->metadata['photo_url'] ?? null;

        if (empty($photoUrl)) {
            Log::debug('No photo URL for author', [
                'author_id' => $author->id,
                'name' => $author->name,
            ]);

            return;
        }

        $identifier = $author->open_library_key ?? $author->slug ?? 'author-'.$author->id;
        $photoPath = $mediaStorage->store($photoUrl, 'authors', $identifier);

        if ($photoPath) {
            $author->update([
                'photo_path' => $photoPath,
                'photo_url' => $photoUrl,
            ]);

            Log::info('Author photo stored successfully', [
                'author_id' => $author->id,
                'name' => $author->name,
                'photo_path' => $photoPath,
            ]);
        }
    }
}
