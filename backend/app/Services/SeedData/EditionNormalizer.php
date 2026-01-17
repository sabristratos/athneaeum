<?php

declare(strict_types=1);

namespace App\Services\SeedData;

use App\DTOs\SeedData\EditionCandidateDTO;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Phase 2: Edition Normalization - ISBN-to-Work resolution and edition scoring.
 *
 * Resolves an input ISBN to an Open Library Work, fetches all editions,
 * scores them by quality signals, and returns the best edition (the swap).
 */
class EditionNormalizer
{
    private const BASE_URL = 'https://openlibrary.org';

    private const COVERS_URL = 'https://covers.openlibrary.org';

    private const EDITIONS_LIMIT = 100;

    private const TIMEOUT = 15;

    /**
     * @var array<string, int>
     */
    private array $formatBoosts;

    /**
     * @var array<string, array<string, int>>
     */
    private array $publisherTiers;

    /**
     * @var array<string, int>
     */
    private array $boosts;

    /**
     * @var array<string, int>
     */
    private array $penalties;

    /**
     * @var array<string, int>
     */
    private array $yearBoosts;

    private BookFilterService $filterService;

    public function __construct(BookFilterService $filterService)
    {
        $this->filterService = $filterService;
        $this->formatBoosts = config('seed-data.edition_scoring.format_boosts', []);
        $this->publisherTiers = config('seed-data.edition_scoring.publisher_tiers', []);
        $this->boosts = config('seed-data.edition_scoring.boosts', []);
        $this->penalties = config('seed-data.edition_scoring.penalties', []);
        $this->yearBoosts = config('seed-data.edition_scoring.year_boosts', []);
    }

    /**
     * Normalize a book by finding the best edition.
     *
     * @param  array<string, mixed>  $book  Book data with title, author, isbn fields
     * @return EditionCandidateDTO|null The best edition, or null if none found
     */
    public function normalize(array $book): ?EditionCandidateDTO
    {
        $workKey = $this->resolveWorkKey($book);

        if (! $workKey) {
            Log::debug('[EditionNormalizer] Could not resolve work key', [
                'title' => $book['title'] ?? 'unknown',
            ]);

            return null;
        }

        $editions = $this->fetchEditions($workKey);

        if (empty($editions)) {
            Log::debug('[EditionNormalizer] No editions found', [
                'work_key' => $workKey,
            ]);

            return null;
        }

        return $this->selectBestEdition($editions);
    }

    /**
     * Resolve book to Open Library Work Key.
     *
     * Tries ISBN lookup first, then falls back to title/author search.
     *
     * @param  array<string, mixed>  $book
     */
    private function resolveWorkKey(array $book): ?string
    {
        $isbn = $book['isbn13'] ?? $book['isbn'] ?? null;

        if ($isbn) {
            $workKey = $this->lookupByIsbn($isbn);
            if ($workKey) {
                return $workKey;
            }
        }

        $title = $book['title'] ?? null;
        $author = $book['author'] ?? null;

        if ($title) {
            return $this->searchByTitleAuthor($title, $author);
        }

        return null;
    }

    /**
     * Look up work key by ISBN.
     */
    private function lookupByIsbn(string $isbn): ?string
    {
        try {
            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL.'/api/books', [
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

            $url = $bookData['url'] ?? '';
            if (preg_match('/\/works\/(OL\d+W)/', $url, $matches)) {
                return $matches[1];
            }

            return null;
        } catch (\Exception $e) {
            Log::debug('[EditionNormalizer] ISBN lookup failed', [
                'isbn' => $isbn,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Search for work key by title and author.
     */
    private function searchByTitleAuthor(string $title, ?string $author): ?string
    {
        try {
            $query = $this->buildSearchQuery($title, $author);

            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL.'/search.json', [
                    'q' => $query,
                    'fields' => 'key',
                    'limit' => 1,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $docs = $response->json()['docs'] ?? [];

            if (empty($docs)) {
                return null;
            }

            $key = $docs[0]['key'] ?? '';

            if (preg_match('/OL\d+W/', $key, $matches)) {
                return $matches[0];
            }

            return null;
        } catch (\Exception $e) {
            Log::debug('[EditionNormalizer] Title/author search failed', [
                'title' => $title,
                'author' => $author,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Build Open Library search query.
     */
    private function buildSearchQuery(string $title, ?string $author): string
    {
        $title = preg_replace('/[^\w\s]/', '', $title);
        $parts = ["title:({$title})"];

        if (! empty($author)) {
            $primaryAuthor = explode(',', $author)[0];
            $primaryAuthor = preg_replace('/\s*\([^)]*\)\s*/', '', $primaryAuthor);
            $parts[] = "author:({$primaryAuthor})";
        }

        return implode(' ', $parts);
    }

    /**
     * Fetch all editions of a work.
     *
     * @return array<int, array<string, mixed>>
     */
    private function fetchEditions(string $workKey): array
    {
        try {
            $response = Http::timeout(self::TIMEOUT)
                ->withHeaders(['User-Agent' => 'Athenaeum/1.0'])
                ->get(self::BASE_URL."/works/{$workKey}/editions.json", [
                    'limit' => self::EDITIONS_LIMIT,
                ]);

            if (! $response->successful()) {
                return [];
            }

            return $response->json()['entries'] ?? [];
        } catch (\Exception $e) {
            Log::debug('[EditionNormalizer] Edition fetch failed', [
                'work_key' => $workKey,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Select the best edition from a list.
     *
     * @param  array<int, array<string, mixed>>  $editions
     */
    private function selectBestEdition(array $editions): ?EditionCandidateDTO
    {
        $candidates = [];

        foreach ($editions as $edition) {
            $candidate = $this->scoreEdition($edition);

            if ($candidate) {
                $candidates[] = $candidate;
            }
        }

        if (empty($candidates)) {
            return null;
        }

        usort($candidates, fn ($a, $b) => $b->score <=> $a->score);

        $best = $candidates[0];

        Log::debug('[EditionNormalizer] Selected best edition', [
            'edition_key' => $best->editionKey,
            'isbn' => $best->getBestIsbn(),
            'publisher' => $best->publisher,
            'score' => $best->score,
            'breakdown' => $best->scoreBreakdown,
        ]);

        return $best;
    }

    /**
     * Score a single edition.
     *
     * @param  array<string, mixed>  $edition
     */
    private function scoreEdition(array $edition): ?EditionCandidateDTO
    {
        $covers = $edition['covers'] ?? [];
        if (empty($covers) || $covers[0] <= 0) {
            return null;
        }

        if ($this->filterService->isAudiobook($edition)) {
            return null;
        }

        $languages = $edition['languages'] ?? [];
        $isEnglish = empty($languages);
        foreach ($languages as $lang) {
            if (str_contains($lang['key'] ?? '', '/eng')) {
                $isEnglish = true;
                break;
            }
        }

        if (! $isEnglish && ! empty($languages)) {
            return null;
        }

        $score = 0;
        $breakdown = [];

        $format = strtolower($edition['physical_format'] ?? '');
        foreach ($this->formatBoosts as $formatName => $boost) {
            if (str_contains($format, $formatName)) {
                $score += $boost;
                $breakdown['format'] = $boost;
                break;
            }
        }

        $publisher = strtolower($edition['publishers'][0] ?? '');
        $publisherScore = $this->scorePublisher($publisher);
        if ($publisherScore > 0) {
            $score += $publisherScore;
            $breakdown['publisher'] = $publisherScore;
        }

        if (! empty($edition['isbn_13'])) {
            $score += $this->boosts['has_isbn13'] ?? 40;
            $breakdown['isbn13'] = $this->boosts['has_isbn13'] ?? 40;
        } elseif (! empty($edition['isbn_10'])) {
            $score += $this->boosts['has_isbn10'] ?? 30;
            $breakdown['isbn10'] = $this->boosts['has_isbn10'] ?? 30;
        } else {
            $score += $this->penalties['no_isbn'] ?? -20;
            $breakdown['no_isbn'] = $this->penalties['no_isbn'] ?? -20;
        }

        $year = $this->extractYear($edition['publish_date'] ?? '');
        if ($year) {
            $yearScore = $this->scoreYear($year);
            if ($yearScore > 0) {
                $score += $yearScore;
                $breakdown['year'] = $yearScore;
            }
        }

        if (count($covers) > 1) {
            $multiCoverBoost = $this->boosts['multiple_covers'] ?? 10;
            $score += $multiCoverBoost;
            $breakdown['multiple_covers'] = $multiCoverBoost;
        }

        if ($isEnglish && ! empty($languages)) {
            $langBoost = $this->boosts['english_language'] ?? 5;
            $score += $langBoost;
            $breakdown['english'] = $langBoost;
        }

        $title = strtolower($edition['title'] ?? '');
        if ($this->filterService->isMovieTieIn(['title' => $title])) {
            $penalty = $this->penalties['movie_tie_in'] ?? -30;
            $score += $penalty;
            $breakdown['movie_tie_in'] = $penalty;
        }

        $coverId = $covers[0];
        $coverUrl = self::COVERS_URL."/b/id/{$coverId}-L.jpg";

        return EditionCandidateDTO::fromOpenLibraryEdition(
            $edition,
            $coverUrl,
            $score,
            $breakdown
        );
    }

    /**
     * Score publisher based on tiers.
     */
    private function scorePublisher(string $publisher): int
    {
        foreach ($this->publisherTiers['premium'] ?? [] as $name => $score) {
            if (str_contains($publisher, $name)) {
                return $score;
            }
        }

        foreach ($this->publisherTiers['quality'] ?? [] as $name => $score) {
            if (str_contains($publisher, $name)) {
                return $score;
            }
        }

        return 0;
    }

    /**
     * Score publication year.
     */
    private function scoreYear(int $year): int
    {
        if ($year >= 2000 && $year <= 2005) {
            return $this->yearBoosts['2000-2005'] ?? 50;
        }

        if ($year >= 1990 && $year <= 1999) {
            return $this->yearBoosts['1990-1999'] ?? 45;
        }

        if ($year >= 2006 && $year <= 2010) {
            return $this->yearBoosts['2006-2010'] ?? 25;
        }

        if ($year >= 2011 && $year <= 2015) {
            return $this->yearBoosts['2011-2015'] ?? 10;
        }

        return 0;
    }

    /**
     * Extract year from date string.
     */
    private function extractYear(string $dateStr): ?int
    {
        if (preg_match('/\b(19|20)\d{2}\b/', $dateStr, $matches)) {
            return (int) $matches[0];
        }

        return null;
    }

    /**
     * Build an Open Library cover URL for an ISBN.
     */
    public function buildCoverUrl(string $isbn): string
    {
        return self::COVERS_URL."/b/isbn/{$isbn}-L.jpg";
    }
}
