<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Contracts\MediaStorageServiceInterface;
use App\Models\Book;
use App\Services\BookSearch\GoogleBooksService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;

class EnrichBookJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $backoff = 60;

    public function __construct(
        public int $bookId
    ) {}

    public function middleware(): array
    {
        return [new RateLimited('google-books-api')];
    }

    public function handle(GoogleBooksService $googleBooks, MediaStorageServiceInterface $mediaStorage): void
    {
        $book = Book::find($this->bookId);

        if (! $book) {
            return;
        }

        if (! empty($book->cover_path) && ! empty($book->description)) {
            return;
        }

        $enrichment = $googleBooks->lookupForEnrichment(
            $book->isbn,
            $book->title,
            $book->author
        );

        if (! $enrichment) {
            Log::debug('No enrichment data found', [
                'book_id' => $book->id,
                'title' => $book->title,
            ]);

            return;
        }

        $updates = [];

        if (empty($book->cover_path) && ! empty($enrichment['cover_url'])) {
            $identifier = $book->isbn13 ?? $book->isbn ?? 'book-'.$book->id;
            $coverPath = $mediaStorage->store($enrichment['cover_url'], 'covers', $identifier);

            if ($coverPath) {
                $updates['cover_path'] = $coverPath;
            }

            $updates['cover_url'] = $enrichment['cover_url'];
        }

        if (empty($book->description) && ! empty($enrichment['description'])) {
            $updates['description'] = $enrichment['description'];
        }

        if (empty($book->page_count) && ! empty($enrichment['page_count'])) {
            $updates['page_count'] = $enrichment['page_count'];
        }

        if (empty($book->isbn) && ! empty($enrichment['isbn'])) {
            $updates['isbn'] = $enrichment['isbn'];
        }

        if (empty($book->published_date) && ! empty($enrichment['published_date'])) {
            $updates['published_date'] = $enrichment['published_date'];
        }

        if (empty($book->external_id) && ! empty($enrichment['external_id'])) {
            $updates['external_id'] = $enrichment['external_id'];
            $updates['external_provider'] = 'google_books';
        }

        if (! empty($updates)) {
            $book->update($updates);

            Log::info('Book enriched successfully', [
                'book_id' => $book->id,
                'title' => $book->title,
                'fields_updated' => array_keys($updates),
            ]);
        }
    }
}
