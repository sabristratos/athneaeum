<?php

declare(strict_types=1);

namespace App\Services\Metadata\Sources;

use App\DTOs\Metadata\MetadataQueryDTO;
use App\DTOs\Metadata\MetadataResultDTO;
use App\Services\BookSearch\OpenLibraryBookService;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Open Library metadata source adapter.
 *
 * Uses Calibre-style edition heuristic to find clean covers:
 * 1. Search for work -> get work key
 * 2. Fetch editions of that work
 * 3. Rank editions by quality signals (ISBN, recency, publisher)
 * 4. Use best edition's cover (not the default work cover)
 */
class OpenLibrarySource extends AbstractMetadataSource
{
    private const BASE_URL = 'https://openlibrary.org';

    private const COVERS_URL = 'https://covers.openlibrary.org';

    private const EDITIONS_LIMIT = 50;

    public function __construct(
        private readonly OpenLibraryBookService $service
    ) {}

    public function getSourceName(): string
    {
        return 'open_library';
    }

    public function getPriority(): int
    {
        return (int) config('metadata.sources.open_library.priority', 10);
    }

    protected function lookupByIsbn(string $isbn): ?MetadataResultDTO
    {
        $data = $this->service->lookupByIsbn($isbn);

        return $data ? $this->toResultDTO($data, true) : null;
    }

    protected function searchByTitleAuthor(string $title, ?string $author): ?MetadataResultDTO
    {
        try {
            $query = $this->buildSearchQuery($title, $author);
            $timeout = (int) config('metadata.parallel.timeout', 15);

            $response = Http::timeout($timeout)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL.'/search.json', [
                    'q' => $query,
                    'fields' => 'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,publisher,subject',
                    'limit' => 1,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $docs = $response->json()['docs'] ?? [];

            if (empty($docs)) {
                return null;
            }

            $firstResult = $docs[0];
            $workKey = $this->cleanWorkKey($firstResult['key'] ?? '');

            // Try to find the best edition with a quality cover and ISBN
            $bestEdition = null;
            if (! empty($workKey)) {
                $bestEdition = $this->findBestEditionCover($workKey);

                if ($bestEdition) {
                    Log::debug('[OpenLibrarySource] Found best edition', [
                        'work' => $workKey,
                        'publisher' => $bestEdition['publisher'],
                        'year' => $bestEdition['year'],
                        'isbn13' => $bestEdition['isbn13'] ?? null,
                        'score' => $bestEdition['score'],
                    ]);
                }
            }

            $normalized = $this->normalizeSearchResponse($firstResult, $bestEdition);

            return $this->toResultDTO($normalized, false);
        } catch (\Exception $e) {
            Log::warning('[OpenLibrarySource] Search failed', [
                'title' => $title,
                'author' => $author,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Find the best cover from work editions using quality heuristics.
     *
     * Prioritizes:
     * 1. Has cover ID (required)
     * 2. Has ISBN-13 (signal of digital import, not scan)
     * 3. Recent publication year (less likely to be phone scans)
     * 4. Known good publishers
     *
     * @return array{url: string, edition: string, year: int|null, has_isbn: bool, score: int}|null
     */
    private function findBestEditionCover(string $workKey): ?array
    {
        try {
            $timeout = (int) config('metadata.parallel.timeout', 15);

            $response = Http::timeout($timeout)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL."/works/{$workKey}/editions.json", [
                    'limit' => self::EDITIONS_LIMIT,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $editions = $response->json()['entries'] ?? [];

            if (empty($editions)) {
                return null;
            }

            return $this->rankEditions($editions);
        } catch (\Exception $e) {
            Log::debug('[OpenLibrarySource] Edition fetch failed', [
                'work' => $workKey,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Rank editions by quality/popularity signals and return best cover.
     *
     * Prioritizes editions most likely to have high-quality publisher covers:
     * 1. Major US publishers (Scholastic, Random House, etc.) - most popular editions
     * 2. Has ISBN (indicates official publication, not user upload)
     * 3. English language editions
     * 4. Multiple covers (indicates active/maintained entry)
     *
     * @param  array<int, array<string, mixed>>  $editions
     * @return array{url: string, edition: string, year: int|null, has_isbn: bool, score: int, publisher: string|null}|null
     */
    private function rankEditions(array $editions): ?array
    {
        $candidates = [];

        // Tier 1: Premium US publishers (highest quality covers, most popular editions)
        $premiumPublishers = [
            'scholastic' => 200,      // Major US children's/YA publisher
            'random house' => 180,    // Major US publisher
            'penguin' => 170,         // Major global publisher
            'simon & schuster' => 160,
            'harpercollins' => 150,
            'little, brown' => 140,
            'doubleday' => 130,
            'knopf' => 130,
            'putnam' => 120,
            'viking' => 120,
        ];

        // Tier 2: Other quality publishers
        $goodPublishers = [
            'macmillan' => 80,
            'hachette' => 80,
            'bloomsbury' => 70,
            'tor' => 70,
            'del rey' => 70,
            'bantam' => 60,
            'ace' => 60,
            'berkley' => 60,
            'vintage' => 50,
            'anchor' => 50,
        ];

        foreach ($editions as $edition) {
            $covers = $edition['covers'] ?? [];

            if (empty($covers)) {
                continue;
            }

            $coverId = $covers[0];

            if ($coverId === -1 || $coverId <= 0) {
                continue;
            }

            $format = strtolower($edition['physical_format'] ?? '');
            $title = strtolower($edition['title'] ?? '');
            $publisher = strtolower($edition['publishers'][0] ?? '');

            // Skip audiobooks - they have different covers
            $isAudiobook = str_contains($format, 'audio')
                || str_contains($format, 'cd')
                || str_contains($format, 'mp3')
                || str_contains($title, 'audiobook')
                || str_contains($title, 'audio book')
                || str_contains($publisher, 'audible')
                || str_contains($publisher, 'recorded books')
                || str_contains($publisher, 'brilliance')
                || str_contains($publisher, 'listening library')
                || str_contains($publisher, 'books on tape');

            if ($isAudiobook) {
                continue;
            }

            $score = 0;

            // Prefer ebook/digital editions (cleaner, professional covers)
            $isEbook = str_contains($format, 'ebook')
                || str_contains($format, 'kindle')
                || str_contains($format, 'epub')
                || str_contains($format, 'electronic')
                || str_contains($format, 'digital')
                || str_contains($publisher, 'kindle')
                || str_contains($publisher, 'ebooks');

            if ($isEbook) {
                $score += 100;
            }

            $hasIsbn = false;

            // Major boost for premium publishers (most popular editions)
            foreach ($premiumPublishers as $name => $bonus) {
                if (str_contains($publisher, $name)) {
                    $score += $bonus;
                    break;
                }
            }

            // Smaller boost for other quality publishers
            if ($score === 0) {
                foreach ($goodPublishers as $name => $bonus) {
                    if (str_contains($publisher, $name)) {
                        $score += $bonus;
                        break;
                    }
                }
            }

            // ISBN indicates official publication
            if (! empty($edition['isbn_13'])) {
                $score += 40;
                $hasIsbn = true;
            } elseif (! empty($edition['isbn_10'])) {
                $score += 30;
                $hasIsbn = true;
            }

            // Small boost for English editions
            $languages = $edition['languages'] ?? [];
            foreach ($languages as $lang) {
                if (str_contains($lang['key'] ?? '', '/eng')) {
                    $score += 5;  // Small boost, shouldn't override year preference
                    break;
                }
            }

            // Multiple covers suggests maintained/popular entry
            if (count($covers) > 1) {
                $score += 10;
            }

            // Strongly prefer original/first edition years for classic iconic covers
            // The earliest edition from a premium publisher typically has THE iconic cover
            $year = $this->extractYear($edition['publish_date'] ?? '');
            if ($year) {
                // First edition era gets massive boost (2000-2005 for modern books)
                if ($year >= 2000 && $year <= 2005) {
                    $score += 50;  // First editions have the classic covers
                } elseif ($year >= 1990 && $year <= 1999) {
                    $score += 45;
                } elseif ($year >= 2006 && $year <= 2010) {
                    $score += 25;
                } elseif ($year >= 2011 && $year <= 2015) {
                    $score += 10;
                }
                // Newer editions (2016+) often have redesigned covers, no boost
            }

            $candidates[] = [
                'url' => $this->buildCoverUrl((string) $coverId, 'id'),
                'edition' => $edition['key'] ?? '',
                'year' => $year,
                'has_isbn' => $hasIsbn,
                'score' => $score,
                'cover_id' => $coverId,
                'publisher' => $edition['publishers'][0] ?? null,
                'isbn13' => $edition['isbn_13'][0] ?? null,
                'isbn10' => $edition['isbn_10'][0] ?? null,
            ];
        }

        if (empty($candidates)) {
            return null;
        }

        usort($candidates, fn ($a, $b) => $b['score'] <=> $a['score']);

        return $candidates[0];
    }

    /**
     * Extract year from various date formats.
     */
    private function extractYear(string $dateStr): ?int
    {
        if (preg_match('/\b(19|20)\d{2}\b/', $dateStr, $matches)) {
            return (int) $matches[0];
        }

        return null;
    }

    public function prepareAsyncQuery(MetadataQueryDTO $query): ?callable
    {
        $timeout = (int) config('metadata.parallel.timeout', 15);

        return function (Pool $pool) use ($query, $timeout) {
            if ($query->hasIsbn()) {
                $isbn = $this->cleanIsbn($query->getPrimaryIsbn());

                return $pool->timeout($timeout)
                    ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                    ->get(self::BASE_URL.'/api/books', [
                        'bibkeys' => "ISBN:{$isbn}",
                        'jscmd' => 'data',
                        'format' => 'json',
                    ]);
            }

            $q = $this->buildSearchQuery($query->title, $query->author);

            return $pool->timeout($timeout)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL.'/search.json', [
                    'q' => $q,
                    'fields' => 'key,title,author_name,author_key,first_publish_year,cover_i,isbn,number_of_pages_median,publisher,subject',
                    'limit' => 5,
                ]);
        };
    }

    public function parseAsyncResponse(mixed $response): ?MetadataResultDTO
    {
        if (! $response instanceof Response || ! $response->successful()) {
            return null;
        }

        $data = $response->json();

        if (empty($data)) {
            return null;
        }

        foreach ($data as $key => $bookData) {
            if (str_starts_with($key, 'ISBN:')) {
                return $this->toResultDTO(
                    $this->normalizeIsbnResponse($bookData, str_replace('ISBN:', '', $key)),
                    true
                );
            }
        }

        if (isset($data['docs']) && ! empty($data['docs'])) {
            $doc = $data['docs'][0];

            return $this->toResultDTO($this->normalizeSearchResponse($doc), false);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function toResultDTO(array $data, bool $isIdentifierMatch): MetadataResultDTO
    {
        return new MetadataResultDTO(
            source: 'open_library',
            isIdentifierMatch: $isIdentifierMatch,
            title: $data['title'] ?? null,
            author: $data['author'] ?? null,
            description: $data['description'] ?? null,
            coverUrl: $data['cover_url'] ?? null,
            coverUrlFallback: $data['cover_url_fallback'] ?? null,
            pageCount: isset($data['page_count']) ? (int) $data['page_count'] : null,
            publishedDate: $data['published_date'] ?? null,
            publisher: $data['publisher'] ?? null,
            isbn: $data['isbn'] ?? null,
            isbn13: $data['isbn13'] ?? null,
            genres: $data['subjects'] ?? null,
            workKey: $data['work_key'] ?? null,
        );
    }

    private function buildSearchQuery(string $title, ?string $author): string
    {
        $title = preg_replace('/[^\w\s]/', '', $title);
        $parts = ["title:({$title})"];

        if (! empty($author)) {
            $primaryAuthor = explode(',', $author)[0];
            $primaryAuthor = preg_replace('/\s*\([^)]*\)\s*/', '', $primaryAuthor);
            $authorName = $this->extractAuthorLastName(trim($primaryAuthor));

            if (! empty($authorName)) {
                $parts[] = "author:({$authorName})";
            }
        }

        return implode(' ', $parts);
    }

    /**
     * Extract a searchable author name, preferring last name for robustness.
     *
     * Handles cases like "J.R.R. Tolkien" -> "Tolkien" since Open Library
     * search is sensitive to exact name formatting.
     */
    private function extractAuthorLastName(string $author): string
    {
        $author = preg_replace('/[^\p{L}\s.]/u', '', $author);

        $parts = preg_split('/\s+/', $author);
        $parts = array_filter($parts, fn ($p) => mb_strlen($p) > 1);

        if (empty($parts)) {
            return $author;
        }

        $lastName = end($parts);

        if (mb_strlen($lastName) < 2) {
            return implode(' ', $parts);
        }

        return $lastName;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeIsbnResponse(array $data, string $isbn): array
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

        $coverUrl = $isbn ? $this->buildCoverUrl($isbn, 'isbn') : null;

        return [
            'title' => $data['title'] ?? null,
            'author' => implode(', ', array_filter($authors)),
            'description' => null,
            'cover_url' => $coverUrl,
            'page_count' => $data['number_of_pages'] ?? null,
            'published_date' => $data['publish_date'] ?? null,
            'publisher' => $data['publishers'][0]['name'] ?? null,
            'isbn' => $isbn,
            'isbn13' => $data['identifiers']['isbn_13'][0] ?? null,
            'subjects' => $subjects,
            'work_key' => $this->extractWorkKey($data['url'] ?? ''),
        ];
    }

    /**
     * Normalize search response using best edition data when available.
     *
     * @param  array<string, mixed>  $doc  Search result document
     * @param  array<string, mixed>|null  $bestEdition  Best edition from rankEditions()
     * @return array<string, mixed>
     */
    private function normalizeSearchResponse(array $doc, ?array $bestEdition = null): array
    {
        $authors = $doc['author_name'] ?? [];
        $workCoverId = $doc['cover_i'] ?? null;

        // Use best edition data if available (from publisher ranking)
        if ($bestEdition) {
            $isbn = $bestEdition['isbn13'] ?? $bestEdition['isbn10'] ?? null;
            $editionCoverId = $bestEdition['cover_id'] ?? null;

            // Primary: ISBN-based URL (higher quality)
            $coverUrl = $isbn ? $this->buildCoverUrl($isbn, 'isbn') : null;

            // Fallback chain: edition cover_id, then work cover_i
            // Work cover_i often has better covers than specific edition covers
            $coverUrlFallback = null;
            if ($workCoverId && $workCoverId !== $editionCoverId) {
                $coverUrlFallback = $this->buildCoverUrl((string) $workCoverId, 'id');
            } elseif ($editionCoverId) {
                $coverUrlFallback = $this->buildCoverUrl((string) $editionCoverId, 'id');
            }

            // If no ISBN, use work cover_i as primary (most reliable)
            if (! $coverUrl) {
                $coverUrl = $workCoverId
                    ? $this->buildCoverUrl((string) $workCoverId, 'id')
                    : ($editionCoverId ? $this->buildCoverUrl((string) $editionCoverId, 'id') : null);
                $coverUrlFallback = null;
            }

            return [
                'title' => $doc['title'] ?? null,
                'author' => implode(', ', $authors),
                'description' => null,
                'cover_url' => $coverUrl,
                'cover_url_fallback' => $coverUrlFallback,
                'page_count' => $doc['number_of_pages_median'] ?? null,
                'published_date' => isset($doc['first_publish_year']) ? (string) $doc['first_publish_year'] : null,
                'publisher' => $bestEdition['publisher'] ?? ($doc['publisher'][0] ?? null),
                'isbn' => $isbn,
                'isbn13' => $bestEdition['isbn13'] ?? null,
                'subjects' => $doc['subject'] ?? [],
                'work_key' => $this->cleanWorkKey($doc['key'] ?? ''),
            ];
        }

        // Fallback: use cover_id from search (no edition ranking available)
        $coverUrl = $workCoverId ? $this->buildCoverUrl((string) $workCoverId, 'id') : null;

        return [
            'title' => $doc['title'] ?? null,
            'author' => implode(', ', $authors),
            'description' => null,
            'cover_url' => $coverUrl,
            'page_count' => $doc['number_of_pages_median'] ?? null,
            'published_date' => isset($doc['first_publish_year']) ? (string) $doc['first_publish_year'] : null,
            'publisher' => $doc['publisher'][0] ?? null,
            'isbn' => null,
            'isbn13' => null,
            'subjects' => $doc['subject'] ?? [],
            'work_key' => $this->cleanWorkKey($doc['key'] ?? ''),
        ];
    }

    private function buildCoverUrl(string $identifier, string $type): string
    {
        return self::COVERS_URL."/b/{$type}/{$identifier}-L.jpg";
    }

    private function extractWorkKey(string $url): ?string
    {
        if (preg_match('/\/works\/(OL\d+W)/', $url, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function cleanWorkKey(string $key): string
    {
        if (preg_match('/OL\d+W/', $key, $matches)) {
            return $matches[0];
        }

        return $key;
    }
}
