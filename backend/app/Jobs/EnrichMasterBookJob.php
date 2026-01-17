<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Contracts\AuthorResolverInterface;
use App\Contracts\Discovery\CoverStorageServiceInterface;
use App\Contracts\Discovery\EmbeddingServiceInterface;
use App\Models\MasterBook;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Job to enrich a master book with additional metadata.
 *
 * Fetches missing data from Open Library, downloads and stores covers locally,
 * and generates embeddings for popular books.
 */
class EnrichMasterBookJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;

    public int $tries = 3;

    public int $backoff = 30;

    /**
     * @param  int  $masterBookId  The ID of the master book to enrich
     * @param  array<string>  $sources  Data sources to fetch from
     */
    public function __construct(
        public int $masterBookId,
        public array $sources = ['open_library']
    ) {}

    public function handle(
        CoverStorageServiceInterface $coverStorage,
        EmbeddingServiceInterface $embeddingService,
        AuthorResolverInterface $authorResolver
    ): void {
        $book = MasterBook::find($this->masterBookId);

        if (! $book) {
            Log::warning('[EnrichMasterBook] Book not found', ['id' => $this->masterBookId]);

            return;
        }

        Log::info('[EnrichMasterBook] Starting enrichment', [
            'book_id' => $book->id,
            'title' => $book->title,
            'sources' => $this->sources,
        ]);

        $enriched = false;

        // 1. Enrich from Open Library (free, no API key)
        if (in_array('open_library', $this->sources)) {
            $enriched = $this->enrichFromOpenLibrary($book) || $enriched;
        }

        // 2. Resolve and link authors if not already linked
        if ($book->authors()->count() === 0 && $book->author) {
            $enriched = $this->enrichAuthors($book, $authorResolver) || $enriched;
        }

        // 3. Download and store cover locally
        if (! $book->cover_path && $book->cover_url_external) {
            $path = $coverStorage->store($book->cover_url_external, $book);
            if ($path) {
                $enriched = true;
                Log::debug('[EnrichMasterBook] Cover stored', ['path' => $path]);
            }
        }

        // 4. Generate embedding if popular enough (user_count >= 2)
        if ($book->user_count >= 2 && ! $book->is_embedded && $embeddingService->isEnabled()) {
            $enriched = $this->generateEmbedding($book, $embeddingService) || $enriched;
        }

        // 5. Update completeness score and metadata
        $book->completeness_score = $book->calculateCompleteness();
        $book->last_enriched_at = now();
        $book->data_sources = array_values(array_unique([
            ...($book->data_sources ?? []),
            ...$this->sources,
        ]));
        $book->save();

        Log::info('[EnrichMasterBook] Enrichment complete', [
            'book_id' => $book->id,
            'enriched' => $enriched,
            'completeness' => $book->completeness_score,
            'author_count' => $book->authors()->count(),
        ]);
    }

    /**
     * Resolve and link authors to the book.
     */
    private function enrichAuthors(MasterBook $book, AuthorResolverInterface $authorResolver): bool
    {
        try {
            $authors = $authorResolver->resolveWithEnrichment($book->author);

            if ($authors->isEmpty()) {
                return false;
            }

            $position = 1;
            foreach ($authors as $author) {
                $book->authors()->syncWithoutDetaching([
                    $author->id => ['position' => $position++],
                ]);
            }

            Log::debug('[EnrichMasterBook] Authors linked', [
                'book_id' => $book->id,
                'author_count' => $authors->count(),
            ]);

            return true;
        } catch (\Exception $e) {
            Log::warning('[EnrichMasterBook] Author enrichment failed', [
                'book_id' => $book->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Enrich book metadata from Open Library.
     */
    private function enrichFromOpenLibrary(MasterBook $book): bool
    {
        $enriched = false;

        try {
            $data = null;

            // Try ISBN lookup first
            if ($book->isbn13) {
                $data = $this->fetchOpenLibraryByIsbn($book->isbn13);
            } elseif ($book->isbn10) {
                $data = $this->fetchOpenLibraryByIsbn($book->isbn10);
            }

            // Fall back to search if no ISBN or no results
            if (! $data && $book->title) {
                $data = $this->searchOpenLibrary($book->title, $book->author);
            }

            if (! $data) {
                return false;
            }

            // Fill in missing fields
            $updates = [];

            if (empty($book->description) && ! empty($data['description'])) {
                $updates['description'] = is_string($data['description'])
                    ? $data['description']
                    : ($data['description']['value'] ?? null);
            }

            if (empty($book->page_count) && ! empty($data['number_of_pages'])) {
                $updates['page_count'] = (int) $data['number_of_pages'];
            }

            if (empty($book->published_date) && ! empty($data['publish_date'])) {
                $updates['published_date'] = $this->parseOpenLibraryDate($data['publish_date']);
            }

            if (empty($book->publisher) && ! empty($data['publishers'])) {
                $updates['publisher'] = is_array($data['publishers'])
                    ? ($data['publishers'][0] ?? null)
                    : $data['publishers'];
            }

            if (empty($book->subjects) && ! empty($data['subjects'])) {
                $updates['subjects'] = array_slice(
                    array_map(fn ($s) => is_string($s) ? $s : ($s['name'] ?? ''), $data['subjects']),
                    0,
                    20
                );
            }

            if (empty($book->open_library_key) && ! empty($data['key'])) {
                $updates['open_library_key'] = $data['key'];
            }

            // Get cover if we don't have one
            if (empty($book->cover_url_external) && ! empty($data['covers'])) {
                $coverId = $data['covers'][0];
                $updates['cover_url_external'] = "https://covers.openlibrary.org/b/id/{$coverId}-L.jpg";
            }

            if (! empty($updates)) {
                $book->update($updates);
                $enriched = true;

                Log::debug('[EnrichMasterBook] Open Library enrichment applied', [
                    'book_id' => $book->id,
                    'fields' => array_keys($updates),
                ]);
            }
        } catch (\Exception $e) {
            Log::warning('[EnrichMasterBook] Open Library enrichment failed', [
                'book_id' => $book->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $enriched;
    }

    /**
     * Fetch book data from Open Library by ISBN.
     */
    private function fetchOpenLibraryByIsbn(string $isbn): ?array
    {
        $response = Http::timeout(15)
            ->get("https://openlibrary.org/isbn/{$isbn}.json");

        if ($response->successful()) {
            return $response->json();
        }

        return null;
    }

    /**
     * Search Open Library by title and author.
     */
    private function searchOpenLibrary(string $title, ?string $author): ?array
    {
        $query = $title;
        if ($author) {
            $query .= ' '.$author;
        }

        $response = Http::timeout(15)
            ->get('https://openlibrary.org/search.json', [
                'q' => $query,
                'limit' => 1,
                'fields' => 'key,title,author_name,number_of_pages_median,first_publish_year,subject,cover_i',
            ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        $docs = $data['docs'] ?? [];

        if (empty($docs)) {
            return null;
        }

        $doc = $docs[0];

        // Transform search result to match edition format
        return [
            'key' => $doc['key'] ?? null,
            'number_of_pages' => $doc['number_of_pages_median'] ?? null,
            'publish_date' => isset($doc['first_publish_year']) ? (string) $doc['first_publish_year'] : null,
            'subjects' => $doc['subject'] ?? [],
            'covers' => isset($doc['cover_i']) ? [$doc['cover_i']] : [],
        ];
    }

    /**
     * Parse Open Library date formats.
     */
    private function parseOpenLibraryDate(?string $date): ?\Carbon\Carbon
    {
        if (empty($date)) {
            return null;
        }

        try {
            // Year only
            if (preg_match('/^\d{4}$/', $date)) {
                return \Carbon\Carbon::createFromFormat('Y', $date)->startOfYear();
            }

            // Various formats
            $formats = [
                'F d, Y',     // "January 1, 2020"
                'F Y',        // "January 2020"
                'Y-m-d',      // "2020-01-01"
                'M d, Y',     // "Jan 1, 2020"
                'M Y',        // "Jan 2020"
            ];

            foreach ($formats as $format) {
                try {
                    return \Carbon\Carbon::createFromFormat($format, $date);
                } catch (\Exception) {
                    continue;
                }
            }

            return \Carbon\Carbon::parse($date);
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Generate and save embedding for the book.
     */
    private function generateEmbedding(MasterBook $book, EmbeddingServiceInterface $embeddingService): bool
    {
        try {
            $text = $embeddingService->buildEmbeddingText($book);

            if (strlen($text) < 10) {
                Log::debug('[EnrichMasterBook] Insufficient text for embedding', ['book_id' => $book->id]);

                return false;
            }

            $embedding = $embeddingService->generateEmbedding($text);

            if (empty($embedding)) {
                return false;
            }

            // Save using raw SQL for pgvector support
            if (config('database.default') === 'pgsql') {
                $vectorString = '['.implode(',', $embedding).']';

                DB::statement(
                    'UPDATE master_books SET embedding = ?, is_embedded = true, updated_at = ? WHERE id = ?',
                    [$vectorString, now(), $book->id]
                );
            } else {
                $book->update([
                    'embedding' => $embedding,
                    'is_embedded' => true,
                ]);
            }

            Log::debug('[EnrichMasterBook] Embedding generated', ['book_id' => $book->id]);

            return true;
        } catch (\Exception $e) {
            Log::warning('[EnrichMasterBook] Embedding generation failed', [
                'book_id' => $book->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[EnrichMasterBook] Job failed', [
            'book_id' => $this->masterBookId,
            'error' => $exception->getMessage(),
        ]);
    }
}
