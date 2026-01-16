<?php

declare(strict_types=1);

namespace App\Contracts\Discovery;

/**
 * Contract for generating text embeddings for semantic similarity.
 *
 * Implementations should handle calling embedding APIs (Gemini, OpenAI, etc.)
 * and returning normalized vector representations.
 */
interface EmbeddingServiceInterface
{
    /**
     * Generate an embedding vector for the given text.
     *
     * @param  string  $text  The text to embed (will be truncated to API limits)
     * @return array<float>  The embedding vector (768 dimensions for Gemini)
     *
     * @throws \RuntimeException If embedding generation fails
     */
    public function generateEmbedding(string $text): array;

    /**
     * Generate embeddings for multiple texts in a batch.
     *
     * @param  array<string>  $texts  Array of texts to embed
     * @return array<array<float>>  Array of embedding vectors
     *
     * @throws \RuntimeException If embedding generation fails
     */
    public function generateBatchEmbeddings(array $texts): array;

    /**
     * Check if the embedding service is enabled and configured.
     */
    public function isEnabled(): bool;

    /**
     * Get the dimension of embeddings produced by this service.
     */
    public function getDimension(): int;

    /**
     * Average multiple embedding vectors into a single normalized vector.
     *
     * @param  array<array<float>>  $vectors  Array of embedding vectors
     * @return array<float>  The averaged and L2-normalized vector
     */
    public function averageVectors(array $vectors): array;

    /**
     * L2-normalize a vector for cosine similarity.
     *
     * @param  array<float>  $vector  The vector to normalize
     * @return array<float>  The normalized vector
     */
    public function normalizeVector(array $vector): array;
}
