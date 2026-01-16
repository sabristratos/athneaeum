<?php

declare(strict_types=1);

namespace App\Services\BookSearch;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Open Library API service for book search and metadata retrieval.
 *
 * Open Library provides community-curated, high-quality book metadata.
 * Used as primary source with Google Books as fallback.
 */
class OpenLibraryBookService
{
    private const BASE_URL = 'https://openlibrary.org';

    private const COVERS_URL = 'https://covers.openlibrary.org';

    private const TIMEOUT = 15;

    /**
     * Look up a book by ISBN.
     *
     * @return array<string, mixed>|null
     */
    public function lookupByIsbn(string $isbn): ?array
    {
        $isbn = $this->cleanIsbn($isbn);

        if (empty($isbn)) {
            return null;
        }

        try {
            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL."/api/books", [
                    'bibkeys' => "ISBN:{$isbn}",
                    'jscmd' => 'data',
                    'format' => 'json',
                ]);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();
            $bookData = $data["ISBN:{$isbn}"] ?? null;

            if (! $bookData) {
                return null;
            }

            return $this->normalizeBookData($bookData, $isbn);

        } catch (\Exception $e) {
            Log::warning('[OpenLibrary] ISBN lookup failed', [
                'isbn' => $isbn,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Search for books by title and author.
     *
     * @return array<string, mixed>|null Best matching result
     */
    public function searchByTitleAuthor(string $title, ?string $author = null): ?array
    {
        try {
            $query = $this->buildSearchQuery($title, $author);

            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL.'/search.json', [
                    'q' => $query,
                    'fields' => 'key,title,author_name,author_key,first_publish_year,cover_i,isbn,number_of_pages_median,publisher,subject,edition_count',
                    'limit' => 5,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();
            $docs = $data['docs'] ?? [];

            if (empty($docs)) {
                return null;
            }

            $bestMatch = $this->findBestMatch($docs, $title, $author);

            if (! $bestMatch) {
                return null;
            }

            return $this->normalizeSearchResult($bestMatch);

        } catch (\Exception $e) {
            Log::warning('[OpenLibrary] Search failed', [
                'title' => $title,
                'author' => $author,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Get detailed work information.
     *
     * @param  string  $workKey  Open Library work key (e.g., "OL27448W" or "/works/OL27448W")
     * @return array<string, mixed>|null
     */
    public function getWork(string $workKey): ?array
    {
        $workKey = $this->cleanWorkKey($workKey);

        try {
            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL."/works/{$workKey}.json");

            if (! $response->successful()) {
                return null;
            }

            return $response->json();

        } catch (\Exception $e) {
            Log::warning('[OpenLibrary] Work fetch failed', [
                'work_key' => $workKey,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Look up book for enrichment - tries ISBN first, then title/author search.
     *
     * Falls back to title-only search if author search fails (handles author name variations).
     *
     * @return array<string, mixed>|null Normalized book data
     */
    public function lookupForEnrichment(?string $isbn, string $title, ?string $author): ?array
    {
        if (! empty($isbn)) {
            $result = $this->lookupByIsbn($isbn);

            if ($result) {
                if (empty($result['description'])) {
                    $result = $this->enrichWithWorkData($result);
                }

                return $result;
            }
        }

        $result = $this->searchByTitleAuthor($title, $author);

        if (! $result && ! empty($author)) {
            $result = $this->searchByTitleAuthor($title, null);
        }

        if ($result) {
            $result = $this->enrichWithWorkData($result);
        }

        return $result;
    }

    /**
     * Get cover URL for a book.
     *
     * @param  string  $identifier  ISBN, OLID, or cover ID
     * @param  string  $type  'isbn', 'olid', or 'id'
     * @param  string  $size  'S', 'M', or 'L'
     */
    public function getCoverUrl(string $identifier, string $type = 'isbn', string $size = 'L'): string
    {
        $identifier = $type === 'isbn' ? $this->cleanIsbn($identifier) : $identifier;

        return self::COVERS_URL."/b/{$type}/{$identifier}-{$size}.jpg";
    }

    /**
     * Check if a cover exists for the given identifier.
     */
    public function coverExists(string $isbn): bool
    {
        $isbn = $this->cleanIsbn($isbn);

        if (empty($isbn)) {
            return false;
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->head(self::COVERS_URL."/b/isbn/{$isbn}-M.jpg?default=false");

            return $response->successful();

        } catch (\Exception) {
            return false;
        }
    }

    /**
     * Enrich result with work-level data (description, subjects).
     *
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    private function enrichWithWorkData(array $result): array
    {
        $workKey = $result['work_key'] ?? null;

        if (empty($workKey)) {
            return $result;
        }

        $work = $this->getWork($workKey);

        if (! $work) {
            return $result;
        }

        if (empty($result['description'])) {
            $description = $work['description'] ?? null;

            if (is_array($description)) {
                $description = $description['value'] ?? null;
            }

            if (! empty($description)) {
                $result['description'] = $description;
            }
        }

        if (empty($result['subjects']) && ! empty($work['subjects'])) {
            $result['subjects'] = array_slice($work['subjects'], 0, 10);
        }

        return $result;
    }

    /**
     * Normalize book data from the Books API response.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeBookData(array $data, string $isbn): array
    {
        $authors = [];

        if (! empty($data['authors'])) {
            foreach ($data['authors'] as $author) {
                $authors[] = $author['name'] ?? '';
            }
        }

        $subjects = [];

        if (! empty($data['subjects'])) {
            foreach (array_slice($data['subjects'], 0, 10) as $subject) {
                $subjects[] = $subject['name'] ?? $subject;
            }
        }

        $coverUrl = null;

        if (! empty($data['cover']['large'])) {
            $coverUrl = $data['cover']['large'];
        } elseif (! empty($data['cover']['medium'])) {
            $coverUrl = $data['cover']['medium'];
        } elseif (! empty($isbn)) {
            $coverUrl = $this->getCoverUrl($isbn, 'isbn', 'L');
        }

        $identifiers = $data['identifiers'] ?? [];

        return [
            'title' => $data['title'] ?? null,
            'subtitle' => $data['subtitle'] ?? null,
            'author' => implode(', ', array_filter($authors)),
            'authors' => $authors,
            'description' => null,
            'page_count' => $data['number_of_pages'] ?? null,
            'published_date' => $data['publish_date'] ?? null,
            'publisher' => $data['publishers'][0]['name'] ?? null,
            'cover_url' => $coverUrl,
            'isbn' => $isbn,
            'isbn10' => $identifiers['isbn_10'][0] ?? null,
            'isbn13' => $identifiers['isbn_13'][0] ?? null,
            'subjects' => $subjects,
            'work_key' => $this->extractWorkKey($data['url'] ?? ''),
            'open_library_url' => $data['url'] ?? null,
            'source' => 'open_library',
        ];
    }

    /**
     * Normalize search result to standard format.
     *
     * @param  array<string, mixed>  $doc
     * @return array<string, mixed>
     */
    private function normalizeSearchResult(array $doc): array
    {
        $isbns = $doc['isbn'] ?? [];
        $isbn10 = null;
        $isbn13 = null;

        foreach ($isbns as $isbn) {
            $cleaned = preg_replace('/[^\dXx]/', '', $isbn);

            if (strlen($cleaned) === 13 && (str_starts_with($cleaned, '978') || str_starts_with($cleaned, '979'))) {
                $isbn13 = $cleaned;
            } elseif (strlen($cleaned) === 10) {
                $isbn10 = $cleaned;
            }

            if ($isbn13 && $isbn10) {
                break;
            }
        }

        $primaryIsbn = $isbn13 ?? $isbn10 ?? ($isbns[0] ?? null);
        $coverId = $doc['cover_i'] ?? null;

        $coverUrl = null;

        if ($coverId) {
            $coverUrl = $this->getCoverUrl((string) $coverId, 'id', 'L');
        } elseif ($primaryIsbn) {
            $coverUrl = $this->getCoverUrl($primaryIsbn, 'isbn', 'L');
        }

        $authors = $doc['author_name'] ?? [];

        return [
            'title' => $doc['title'] ?? null,
            'subtitle' => null,
            'author' => implode(', ', $authors),
            'authors' => $authors,
            'description' => null,
            'page_count' => $doc['number_of_pages_median'] ?? null,
            'published_date' => isset($doc['first_publish_year']) ? (string) $doc['first_publish_year'] : null,
            'publisher' => $doc['publisher'][0] ?? null,
            'cover_url' => $coverUrl,
            'isbn' => $primaryIsbn,
            'isbn10' => $isbn10,
            'isbn13' => $isbn13,
            'subjects' => $doc['subject'] ?? [],
            'work_key' => $this->cleanWorkKey($doc['key'] ?? ''),
            'open_library_url' => $doc['key'] ? self::BASE_URL.$doc['key'] : null,
            'source' => 'open_library',
        ];
    }

    /**
     * Build search query string.
     *
     * Uses only the primary author (first before comma) to avoid
     * overly restrictive searches with illustrators/editors.
     */
    private function buildSearchQuery(string $title, ?string $author): string
    {
        $parts = [];

        $title = preg_replace('/[^\w\s]/', '', $title);
        $parts[] = "title:({$title})";

        if (! empty($author)) {
            $primaryAuthor = explode(',', $author)[0];
            $primaryAuthor = preg_replace('/[^\w\s]/', '', trim($primaryAuthor));

            if (! empty($primaryAuthor)) {
                $parts[] = "author:({$primaryAuthor})";
            }
        }

        return implode(' ', $parts);
    }

    /**
     * Find the best matching result from search docs.
     *
     * Strongly prefers results with cover images since we need covers for seed data.
     *
     * @param  array<int, array<string, mixed>>  $docs
     * @return array<string, mixed>|null
     */
    private function findBestMatch(array $docs, string $title, ?string $author): ?array
    {
        $titleLower = strtolower(trim($title));
        $primaryAuthor = $author ? strtolower(trim(explode(',', $author)[0])) : null;

        $bestScore = 0;
        $bestMatch = null;

        foreach ($docs as $doc) {
            $score = 0;
            $docTitle = strtolower($doc['title'] ?? '');
            $docAuthors = array_map('strtolower', $doc['author_name'] ?? []);

            if ($docTitle === $titleLower) {
                $score += 100;
            } elseif (str_contains($docTitle, $titleLower) || str_contains($titleLower, $docTitle)) {
                $score += 50;
            } else {
                similar_text($docTitle, $titleLower, $percent);
                $score += $percent / 2;
            }

            if ($primaryAuthor) {
                foreach ($docAuthors as $docAuthor) {
                    if (str_contains($docAuthor, $primaryAuthor) || str_contains($primaryAuthor, $docAuthor)) {
                        $score += 30;
                        break;
                    }
                }
            }

            if (! empty($doc['cover_i'])) {
                $score += 50;
            }

            if (($doc['edition_count'] ?? 0) > 10) {
                $score += 5;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMatch = $doc;
            }
        }

        return $bestScore >= 30 ? $bestMatch : ($docs[0] ?? null);
    }

    /**
     * Clean and validate ISBN.
     */
    private function cleanIsbn(string $isbn): string
    {
        return preg_replace('/[^\dXx]/', '', trim($isbn));
    }

    /**
     * Clean work key to just the ID portion.
     */
    private function cleanWorkKey(string $key): string
    {
        if (preg_match('/OL\d+W/', $key, $matches)) {
            return $matches[0];
        }

        return $key;
    }

    /**
     * Extract work key from URL.
     */
    private function extractWorkKey(string $url): ?string
    {
        if (preg_match('/\/works\/(OL\d+W)/', $url, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
