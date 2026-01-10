<?php

declare(strict_types=1);

namespace App\Services\BookSearch;

use App\Contracts\BookSearchServiceInterface;
use Illuminate\Support\Facades\Http;

/**
 * Open Library API implementation of the book search service.
 *
 * Open Library is a free, open-source book database with no API key required.
 */
class OpenLibraryService implements BookSearchServiceInterface
{
    private const SEARCH_URL = 'https://openlibrary.org/search.json';

    private const WORKS_URL = 'https://openlibrary.org/works';

    private const COVERS_URL = 'https://covers.openlibrary.org/b';

    public function search(
        string $query,
        int $limit = 20,
        int $startIndex = 0,
        ?string $orderBy = null,
        ?string $printType = null,
        ?string $filter = null,
        ?string $langRestrict = null
    ): array {
        $response = Http::get(self::SEARCH_URL, [
            'q' => $query,
            'limit' => min($limit, 100),
            'offset' => $startIndex,
            'fields' => 'key,title,author_name,cover_i,number_of_pages_median,isbn,first_publish_year,subject',
        ]);

        if (! $response->successful()) {
            return [
                'items' => [],
                'totalItems' => 0,
                'startIndex' => $startIndex,
                'hasMore' => false,
            ];
        }

        $totalItems = $response->json('numFound', 0);
        $items = $this->transformResults($response->json('docs', []));

        return [
            'items' => $items,
            'totalItems' => $totalItems,
            'startIndex' => $startIndex,
            'hasMore' => ($startIndex + count($items)) < $totalItems,
        ];
    }

    public function findByExternalId(string $externalId): ?array
    {
        $response = Http::get(self::WORKS_URL.'/'.$externalId.'.json');

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();

        return $this->transformWork($data, $externalId);
    }

    public function getProviderName(): string
    {
        return 'open_library';
    }

    /**
     * Transform Open Library search results to our format.
     */
    private function transformResults(array $docs): array
    {
        return collect($docs)
            ->map(fn ($doc) => $this->transformSearchResult($doc))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Transform a single Open Library search result to our format.
     */
    private function transformSearchResult(array $doc): ?array
    {
        if (empty($doc['title'])) {
            return null;
        }

        $workKey = $doc['key'] ?? null;
        $externalId = $workKey ? str_replace('/works/', '', $workKey) : null;

        return [
            'external_id' => $externalId,
            'title' => $doc['title'],
            'author' => $this->extractAuthors($doc),
            'cover_url' => $this->extractCoverUrl($doc),
            'page_count' => $doc['number_of_pages_median'] ?? null,
            'isbn' => $this->extractIsbn($doc),
            'description' => null,
            'genres' => array_slice($doc['subject'] ?? [], 0, 5),
            'published_date' => $this->formatPublishYear($doc['first_publish_year'] ?? null),
            'average_rating' => null,
            'ratings_count' => null,
        ];
    }

    /**
     * Transform a single Open Library work to our format.
     */
    private function transformWork(array $work, string $externalId): ?array
    {
        if (empty($work['title'])) {
            return null;
        }

        $description = $work['description'] ?? null;
        if (is_array($description)) {
            $description = $description['value'] ?? null;
        }

        return [
            'external_id' => $externalId,
            'title' => $work['title'],
            'author' => $this->extractAuthorsFromWork($work),
            'cover_url' => $this->extractCoverUrlFromWork($work),
            'page_count' => null,
            'isbn' => null,
            'description' => $description,
            'genres' => array_slice($work['subjects'] ?? [], 0, 5),
            'published_date' => $this->formatPublishYear($work['first_publish_date'] ?? null),
            'average_rating' => null,
            'ratings_count' => null,
        ];
    }

    /**
     * Extract authors from search result.
     */
    private function extractAuthors(array $doc): string
    {
        $authors = $doc['author_name'] ?? ['Unknown Author'];

        return implode(', ', array_slice($authors, 0, 3));
    }

    /**
     * Extract authors from work detail.
     */
    private function extractAuthorsFromWork(array $work): string
    {
        $authors = $work['authors'] ?? [];

        if (empty($authors)) {
            return 'Unknown Author';
        }

        return 'Unknown Author';
    }

    /**
     * Extract cover URL from search result using cover_i.
     */
    private function extractCoverUrl(array $doc): ?string
    {
        $coverId = $doc['cover_i'] ?? null;

        if (! $coverId) {
            return null;
        }

        return self::COVERS_URL.'/id/'.$coverId.'-M.jpg';
    }

    /**
     * Extract cover URL from work detail.
     */
    private function extractCoverUrlFromWork(array $work): ?string
    {
        $covers = $work['covers'] ?? [];

        if (empty($covers)) {
            return null;
        }

        return self::COVERS_URL.'/id/'.$covers[0].'-M.jpg';
    }

    /**
     * Extract ISBN from search result.
     */
    private function extractIsbn(array $doc): ?string
    {
        $isbns = $doc['isbn'] ?? [];

        foreach ($isbns as $isbn) {
            if (strlen($isbn) === 13) {
                return $isbn;
            }
        }

        return $isbns[0] ?? null;
    }

    /**
     * Format publish year to date string.
     */
    private function formatPublishYear(int|string|null $year): ?string
    {
        if (! $year) {
            return null;
        }

        if (is_string($year) && preg_match('/^\d{4}/', $year, $matches)) {
            return $matches[0].'-01-01';
        }

        if (is_int($year)) {
            return $year.'-01-01';
        }

        return null;
    }
}
