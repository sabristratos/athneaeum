<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Resolvers;

use App\Contracts\AuthorResolverInterface;
use App\DTOs\Ingestion\AuthorDTO;
use App\Models\Author;
use App\Models\AuthorAlias;
use App\Services\Ingestion\Cleaners\AuthorCleaner;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Resolves author strings to Author models.
 *
 * Handles fuzzy matching, alias resolution, and author creation.
 */
class AuthorResolver implements AuthorResolverInterface
{
    public function __construct(
        private readonly AuthorCleaner $cleaner
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
     * {@inheritdoc}
     */
    public function findOrCreate(AuthorDTO $dto): Author
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

        return DB::transaction(function () use ($dto) {
            $author = Author::create([
                'name' => $dto->name,
                'slug' => $dto->slug,
                'sort_name' => $dto->sortName,
            ]);

            AuthorAlias::learnAlias($dto->name, $author, AuthorAlias::TYPE_VARIANT, 'auto', true);

            return $author;
        });
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
