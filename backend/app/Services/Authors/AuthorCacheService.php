<?php

declare(strict_types=1);

namespace App\Services\Authors;

use App\Contracts\MediaStorageServiceInterface;
use App\Jobs\EnrichAuthorPhotoJob;
use App\Models\Author;
use Illuminate\Support\Str;

/**
 * Service for caching authors in the local database.
 *
 * When a user adds an author to favorites, this service ensures the author
 * is stored locally with enriched metadata from Open Library, so future
 * lookups are instant without hitting external APIs.
 */
class AuthorCacheService
{
    public function __construct(
        private OpenLibraryAuthorService $openLibraryService,
        private MediaStorageServiceInterface $mediaStorage
    ) {}

    /**
     * Ensure an author exists in the database, fetching from Open Library if needed.
     *
     * @param string $name The author's name
     * @param string|null $openLibraryKey Optional Open Library key if known
     * @return Author The cached author record
     */
    public function ensureAuthorCached(string $name, ?string $openLibraryKey = null): Author
    {
        $slug = Str::slug($name);

        $author = Author::where('slug', $slug)
            ->orWhere('name', $name)
            ->first();

        if ($author) {
            if ($openLibraryKey && ! $author->open_library_key) {
                $author->update(['open_library_key' => $openLibraryKey]);
                $this->enrichAuthorMetadata($author);
            }

            return $author;
        }

        $author = Author::create([
            'name' => $name,
            'slug' => $slug,
            'source' => 'user_favorite',
            'open_library_key' => $openLibraryKey,
        ]);

        $this->enrichAuthorMetadata($author);

        return $author;
    }

    /**
     * Enrich author with metadata from Open Library.
     */
    public function enrichAuthorMetadata(Author $author): void
    {
        if ($author->open_library_key) {
            $details = $this->openLibraryService->getAuthor($author->open_library_key);
            if ($details) {
                $this->updateAuthorFromDetails($author, $details);

                return;
            }
        }

        $enriched = $this->openLibraryService->findAndEnrichAuthor($author->name);
        if ($enriched) {
            $author->update([
                'open_library_key' => $enriched['key'],
                'metadata' => array_merge($author->metadata ?? [], $enriched['metadata']),
            ]);
        }
    }

    /**
     * Update author from Open Library details.
     */
    private function updateAuthorFromDetails(Author $author, array $details): void
    {
        $metadata = $author->metadata ?? [];
        $updates = ['metadata' => $metadata];

        if (! empty($details['bio'])) {
            $metadata['bio'] = $details['bio'];
        }
        if (! empty($details['birth_date'])) {
            $metadata['birth_date'] = $details['birth_date'];
        }
        if (! empty($details['death_date'])) {
            $metadata['death_date'] = $details['death_date'];
        }
        if (! empty($details['photo_url'])) {
            $metadata['photo_url'] = $details['photo_url'];
            $updates['photo_url'] = $details['photo_url'];
        }
        if (! empty($details['wikipedia_url'])) {
            $metadata['wikipedia_url'] = $details['wikipedia_url'];
        }

        $updates['metadata'] = $metadata;
        $author->update($updates);

        if (! empty($details['photo_url']) && empty($author->photo_path)) {
            EnrichAuthorPhotoJob::dispatch($author->id)->delay(now()->addSeconds(2));
        }
    }

    /**
     * Search for authors, prioritizing local cache over Open Library.
     *
     * @return array{items: array, totalItems: int, hasMore: bool}
     */
    public function searchAuthors(string $query, int $limit = 20, int $offset = 0): array
    {
        $localAuthors = Author::where('name', 'like', "%{$query}%")
            ->orWhere('slug', 'like', '%'.Str::slug($query).'%')
            ->orderByRaw('CASE WHEN metadata IS NOT NULL THEN 0 ELSE 1 END')
            ->limit($limit)
            ->offset($offset)
            ->get();

        $localItems = $localAuthors->map(fn (Author $a) => $this->transformAuthor($a))->toArray();

        if (count($localItems) >= $limit) {
            return [
                'items' => $localItems,
                'totalItems' => Author::where('name', 'like', "%{$query}%")->count(),
                'hasMore' => true,
            ];
        }

        $openLibraryResults = $this->openLibraryService->searchAuthors($query, $limit, $offset);

        $localKeys = collect($localItems)->pluck('key')->filter()->toArray();
        $combinedItems = $localItems;

        foreach ($openLibraryResults['items'] as $olItem) {
            if (! in_array($olItem['key'], $localKeys, true)) {
                $combinedItems[] = $olItem;
            }
        }

        usort($combinedItems, fn ($a, $b) => ($b['work_count'] ?? 0) <=> ($a['work_count'] ?? 0));

        return [
            'items' => array_slice($combinedItems, 0, $limit),
            'totalItems' => max(count($combinedItems), $openLibraryResults['totalItems']),
            'hasMore' => $openLibraryResults['hasMore'] || count($combinedItems) > $limit,
        ];
    }

    /**
     * Transform Author model to API response format.
     */
    private function transformAuthor(Author $author): array
    {
        $metadata = $author->metadata ?? [];
        $externalPhotoUrl = $author->photo_url ?? $metadata['photo_url'] ?? null;

        return [
            'key' => $author->open_library_key ?? "local-{$author->id}",
            'name' => $author->name,
            'alternate_names' => [],
            'birth_date' => $metadata['birth_date'] ?? null,
            'death_date' => $metadata['death_date'] ?? null,
            'top_work' => $metadata['top_work'] ?? null,
            'work_count' => $metadata['work_count'] ?? $author->books()->count(),
            'top_subjects' => [],
            'photo_url' => $this->mediaStorage->getUrl('authors', $author->photo_path, $externalPhotoUrl),
            'is_cached' => true,
        ];
    }
}
