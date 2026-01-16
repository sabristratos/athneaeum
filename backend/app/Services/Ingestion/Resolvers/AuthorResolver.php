<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Resolvers;

use App\Contracts\AuthorResolverInterface;
use App\DTOs\Ingestion\AuthorDTO;
use App\Jobs\EnrichAuthorPhotoJob;
use App\Models\Author;
use App\Models\AuthorAlias;
use App\Services\Authors\OpenLibraryAuthorService;
use App\Services\Ingestion\Cleaners\AuthorCleaner;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Resolves author strings to Author models.
 *
 * Handles fuzzy matching, alias resolution, and author creation.
 * Optionally enriches new authors with Open Library data.
 */
class AuthorResolver implements AuthorResolverInterface
{
    public function __construct(
        private readonly AuthorCleaner $cleaner,
        private readonly ?OpenLibraryAuthorService $openLibrary = null,
    ) {}

    /**
     * {@inheritdoc}
     */
    public function resolve(string $rawAuthorString): array
    {
        $authorDTOs = $this->cleaner->clean($rawAuthorString);
        $authors = [];

        foreach ($authorDTOs as $dto) {
            $authors[] = $this->findOrCreate($dto);
        }

        return $authors;
    }

    /**
     * Resolve authors with Open Library enrichment for catalog ingestion.
     *
     * @return Collection<int, Author>
     */
    public function resolveWithEnrichment(string $rawAuthorString): Collection
    {
        $authorDTOs = $this->cleaner->clean($rawAuthorString);
        $authors = collect();

        foreach ($authorDTOs as $dto) {
            if ($dto->name === 'Unknown Author') {
                continue;
            }

            $authors->push($this->findOrCreate($dto, enrichWithOpenLibrary: true));
        }

        return $authors;
    }

    /**
     * {@inheritdoc}
     */
    public function findOrCreate(AuthorDTO $dto, bool $enrichWithOpenLibrary = false): Author
    {
        $existing = $this->findBySlug($dto->slug);
        if ($existing) {
            return $existing->getEffectiveAuthor();
        }

        $aliased = $this->findByAlias($dto->name);
        if ($aliased) {
            return $aliased;
        }

        $similar = $this->findSimilar($dto->name, config('ingestion.fuzzy_match_threshold', 0.85));
        if ($similar->isNotEmpty()) {
            $bestMatch = $similar->first();
            AuthorAlias::learnAlias($dto->name, $bestMatch, AuthorAlias::TYPE_VARIANT, 'fuzzy');

            return $bestMatch;
        }

        if ($enrichWithOpenLibrary && $this->openLibrary) {
            return $this->createWithOpenLibraryEnrichment($dto);
        }

        return $this->createMinimalAuthor($dto);
    }

    /**
     * Create a minimal author record without external enrichment.
     */
    private function createMinimalAuthor(AuthorDTO $dto, string $source = 'auto'): Author
    {
        return DB::transaction(function () use ($dto, $source) {
            $author = Author::create([
                'name' => $dto->name,
                'slug' => $dto->slug,
                'sort_name' => $dto->sortName,
                'source' => $source,
            ]);

            AuthorAlias::learnAlias($dto->name, $author, AuthorAlias::TYPE_VARIANT, $source, true);

            return $author;
        });
    }

    /**
     * Create author with Open Library enrichment.
     */
    private function createWithOpenLibraryEnrichment(AuthorDTO $dto): Author
    {
        try {
            $olData = $this->openLibrary->findAndEnrichAuthor($dto->name);

            if ($olData) {
                return $this->createFromOpenLibraryData($olData, $dto);
            }
        } catch (\Exception $e) {
            Log::warning('Open Library enrichment failed', [
                'author' => $dto->name,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->createMinimalAuthor($dto, 'catalog_import');
    }

    /**
     * Create author from Open Library data.
     */
    private function createFromOpenLibraryData(array $olData, AuthorDTO $dto): Author
    {
        $author = DB::transaction(function () use ($olData, $dto) {
            $photoUrl = $olData['metadata']['photo_url'] ?? null;

            $author = Author::create([
                'name' => $olData['name'] ?? $dto->name,
                'slug' => $dto->slug,
                'sort_name' => $dto->sortName ?? Author::generateSortName($olData['name'] ?? $dto->name),
                'metadata' => $olData['metadata'] ?? null,
                'photo_url' => $photoUrl,
                'source' => 'open_library',
                'open_library_key' => $olData['key'] ?? null,
            ]);

            AuthorAlias::learnAlias($dto->name, $author, AuthorAlias::TYPE_VARIANT, 'catalog', true);

            if (! empty($olData['alternate_names'])) {
                foreach (array_slice($olData['alternate_names'], 0, 5) as $altName) {
                    AuthorAlias::learnAlias($altName, $author, AuthorAlias::TYPE_VARIANT, 'open_library');
                }
            }

            return $author;
        });

        if (! empty($author->photo_url)) {
            EnrichAuthorPhotoJob::dispatch($author->id)->delay(now()->addSeconds(2));
        }

        return $author;
    }

    /**
     * {@inheritdoc}
     */
    public function findBySlug(string $slug): ?Author
    {
        return Author::where('slug', $slug)->first();
    }

    /**
     * {@inheritdoc}
     */
    public function findSimilar(string $name, float $threshold = 0.85): Collection
    {
        $allAuthors = Author::where('is_merged', false)->get();

        return $allAuthors
            ->map(function (Author $author) use ($name) {
                similar_text(
                    strtolower($name),
                    strtolower($author->name),
                    $percent
                );

                return [
                    'author' => $author,
                    'similarity' => $percent / 100,
                ];
            })
            ->filter(fn ($item) => $item['similarity'] >= $threshold)
            ->sortByDesc('similarity')
            ->map(fn ($item) => $item['author']);
    }

    /**
     * {@inheritdoc}
     */
    public function findByAlias(string $alias): ?Author
    {
        return AuthorAlias::findAuthorByAlias($alias);
    }

    /**
     * Merge duplicate authors into a canonical author.
     *
     * @param  array<Author>  $duplicates
     */
    public function merge(Author $canonical, array $duplicates): void
    {
        DB::transaction(function () use ($canonical, $duplicates) {
            foreach ($duplicates as $duplicate) {
                if ($duplicate->id === $canonical->id) {
                    continue;
                }

                AuthorAlias::learnAlias(
                    $duplicate->name,
                    $canonical,
                    AuthorAlias::TYPE_VARIANT,
                    'merge',
                    true
                );

                foreach ($duplicate->aliases as $alias) {
                    $alias->update(['author_id' => $canonical->id]);
                }

                DB::table('book_author')
                    ->where('author_id', $duplicate->id)
                    ->update(['author_id' => $canonical->id]);

                $duplicate->update([
                    'is_merged' => true,
                    'canonical_author_id' => $canonical->id,
                ]);
            }
        });
    }
}
