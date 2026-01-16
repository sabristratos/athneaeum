<?php

declare(strict_types=1);

namespace App\Contracts\Discovery;

use App\Models\CatalogBook;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Contract for generating personalized book recommendations.
 *
 * Implementations handle cold-start scenarios, vector similarity queries,
 * and building recommendation feeds with multiple sections.
 */
interface RecommendationServiceInterface
{
    /**
     * Get a personalized discovery feed for the user.
     *
     * Returns multiple sections: personalized, genre-based, trending, etc.
     * For guests (null user), returns only trending/popular sections.
     *
     * @return array{
     *   sections: array<array{
     *     type: string,
     *     title: string,
     *     data: array
     *   }>
     * }
     */
    public function getPersonalizedFeed(?User $user): array;

    /**
     * Get books similar to a given catalog book using vector similarity.
     *
     * @param  int  $catalogBookId  The source book ID
     * @param  int  $limit  Maximum number of results
     * @return Collection<int, CatalogBook>
     */
    public function getSimilarBooks(int $catalogBookId, int $limit = 10): Collection;

    /**
     * Compute a user's preference vector from their reading history.
     *
     * Averages the embeddings of the user's recently read books.
     *
     * @return array<float>|null  The user vector or null if insufficient data
     */
    public function computeUserVector(User $user): ?array;

    /**
     * Refresh a user's cached embedding vector.
     *
     * Should be called after significant reading activity changes.
     */
    public function refreshUserEmbedding(User $user): void;

    /**
     * Search the catalog using semantic similarity.
     *
     * Generates an embedding for the query and finds similar books.
     *
     * @param  string  $query  The search query
     * @param  int  $limit  Maximum number of results
     * @return Collection<int, CatalogBook>
     */
    public function semanticSearch(string $query, int $limit = 20): Collection;
}
