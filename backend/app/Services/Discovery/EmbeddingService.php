<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use App\Contracts\Discovery\EmbeddingServiceInterface;
use App\Models\CatalogBook;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service for generating text embeddings using Gemini API.
 *
 * Uses Gemini text-embedding-004 model to create 768-dimensional
 * vector representations for semantic similarity search.
 */
class EmbeddingService implements EmbeddingServiceInterface
{
    private const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    /**
     * Generate an embedding vector for the given text.
     *
     * @throws \RuntimeException If embedding generation fails
     */
    public function generateEmbedding(string $text): array
    {
        if (! $this->isEnabled()) {
            throw new \RuntimeException('Embedding service is not enabled');
        }

        $maxLength = config('discovery.embedding.max_text_length', 8000);
        $truncatedText = mb_substr($text, 0, $maxLength);

        $apiKey = config('discovery.embedding.api_key');
        $model = config('discovery.embedding.model', 'text-embedding-004');
        $timeout = config('discovery.embedding.timeout', 30);

        $url = self::GEMINI_API_URL."/{$model}:embedContent?key={$apiKey}";

        try {
            $response = Http::timeout($timeout)
                ->retry(2, 1000)
                ->post($url, [
                    'model' => "models/{$model}",
                    'content' => [
                        'parts' => [
                            ['text' => $truncatedText],
                        ],
                    ],
                    'taskType' => 'RETRIEVAL_DOCUMENT',
                ]);

            if (! $response->successful()) {
                Log::error('[EmbeddingService] Gemini API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \RuntimeException('Gemini embedding API error: '.$response->status());
            }

            $embedding = $response->json('embedding.values', []);

            if (empty($embedding)) {
                throw new \RuntimeException('Empty embedding returned from Gemini API');
            }

            Log::debug('[EmbeddingService] Generated embedding', [
                'text_length' => strlen($truncatedText),
                'dimension' => count($embedding),
            ]);

            return $embedding;
        } catch (\Exception $e) {
            Log::error('[EmbeddingService] Failed to generate embedding', [
                'error' => $e->getMessage(),
                'text_preview' => mb_substr($text, 0, 100),
            ]);
            throw $e;
        }
    }

    /**
     * Generate embeddings for multiple texts in a batch.
     *
     * Note: Gemini doesn't have a native batch endpoint, so this
     * processes texts sequentially with rate limiting.
     */
    public function generateBatchEmbeddings(array $texts): array
    {
        $embeddings = [];

        foreach ($texts as $text) {
            try {
                $embeddings[] = $this->generateEmbedding($text);
                usleep(100000);
            } catch (\Exception $e) {
                Log::warning('[EmbeddingService] Batch embedding failed for one text', [
                    'error' => $e->getMessage(),
                ]);
                $embeddings[] = [];
            }
        }

        return $embeddings;
    }

    /**
     * Check if the embedding service is enabled and configured.
     */
    public function isEnabled(): bool
    {
        return config('discovery.embedding.enabled', false)
            && ! empty(config('discovery.embedding.api_key'));
    }

    /**
     * Get the dimension of embeddings produced by this service.
     */
    public function getDimension(): int
    {
        return config('discovery.embedding.dimension', 768);
    }

    /**
     * Build the text to embed for a catalog book.
     *
     * Concatenates title, author, description, and genres for a rich embedding.
     */
    public function buildEmbeddingText(CatalogBook $book): string
    {
        $parts = array_filter([
            $book->title,
            $book->author,
            $book->description,
            is_array($book->genres) ? implode(', ', $book->genres) : null,
        ]);

        return implode(' | ', $parts);
    }

    /**
     * Average multiple embedding vectors into a single vector.
     *
     * Used for computing user preference vectors from multiple books.
     * The result is L2-normalized for use with cosine similarity.
     */
    public function averageVectors(array $vectors): array
    {
        if (empty($vectors)) {
            return [];
        }

        $dimension = count($vectors[0]);
        $result = array_fill(0, $dimension, 0.0);

        foreach ($vectors as $vector) {
            foreach ($vector as $i => $value) {
                $result[$i] += $value;
            }
        }

        $count = count($vectors);
        foreach ($result as $i => $value) {
            $result[$i] = $value / $count;
        }

        return $this->normalizeVector($result);
    }

    /**
     * L2-normalize a vector for cosine similarity.
     *
     * pgvector's cosine distance operator expects normalized vectors
     * for accurate similarity calculations.
     */
    public function normalizeVector(array $vector): array
    {
        if (empty($vector)) {
            return [];
        }

        $magnitude = 0.0;
        foreach ($vector as $value) {
            $magnitude += $value * $value;
        }
        $magnitude = sqrt($magnitude);

        if ($magnitude == 0) {
            return $vector;
        }

        $normalized = [];
        foreach ($vector as $value) {
            $normalized[] = $value / $magnitude;
        }

        return $normalized;
    }
}
