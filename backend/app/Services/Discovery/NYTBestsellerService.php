<?php

declare(strict_types=1);

namespace App\Services\Discovery;

use App\DTOs\Discovery\NYTBookDTO;
use App\Enums\NYTListCategoryEnum;
use App\Models\CatalogBook;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use League\Csv\Reader;

/**
 * Service for ingesting NYT Bestseller data into the catalog.
 *
 * Handles CSV import from existing data and API synchronization
 * for weekly bestseller list updates.
 */
class NYTBestsellerService
{
    /**
     * Ingest NYT bestseller books from a CSV file.
     *
     * @return array{imported: int, skipped: int, errors: array}
     */
    public function ingestFromCsv(string $filePath): array
    {
        if (! file_exists($filePath)) {
            throw new \RuntimeException("CSV file not found: {$filePath}");
        }

        $results = [
            'imported' => 0,
            'skipped' => 0,
            'updated' => 0,
            'errors' => [],
        ];

        try {
            $reader = Reader::createFromPath($filePath, 'r');
            $reader->setHeaderOffset(0);

            foreach ($reader->getRecords() as $index => $record) {
                try {
                    $dto = NYTBookDTO::fromCsvRow($record);

                    if (! $dto->isValid()) {
                        $results['skipped']++;

                        continue;
                    }

                    $result = $this->ingestBook($dto);

                    if ($result === 'imported') {
                        $results['imported']++;
                    } elseif ($result === 'updated') {
                        $results['updated']++;
                    } else {
                        $results['skipped']++;
                    }
                } catch (\Exception $e) {
                    if (count($results['errors']) < 10) {
                        $results['errors'][] = "Row {$index}: {$e->getMessage()}";
                    }
                }
            }

            Log::info('[NYTBestseller] CSV ingestion complete', $results);
        } catch (\Exception $e) {
            Log::error('[NYTBestseller] Failed to ingest CSV', [
                'file' => $filePath,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $results;
    }

    /**
     * Fetch latest bestsellers from NYT Books API.
     *
     * @return array<NYTBookDTO>
     */
    public function fetchLatestBestsellers(): array
    {
        if (! $this->isApiEnabled()) {
            Log::warning('[NYTBestseller] NYT API not configured');

            return [];
        }

        $books = [];
        $date = now()->format('Y-m-d');

        foreach (NYTListCategoryEnum::primaryLists() as $list) {
            $listName = $list->value;
            try {
                $listBooks = $this->fetchList($listName, $date);
                $books = array_merge($books, $listBooks);

                usleep($this->getRateLimitDelay() * 1000000);
            } catch (\Exception $e) {
                Log::error('[NYTBestseller] Failed to fetch list', [
                    'list' => $listName,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('[NYTBestseller] Fetched bestsellers', [
            'total' => count($books),
        ]);

        return $books;
    }

    /**
     * Sync weekly bestsellers from NYT API.
     *
     * @return array{imported: int, updated: int, skipped: int, errors: array}
     */
    public function syncWeeklyBestsellers(): array
    {
        $results = [
            'imported' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        $books = $this->fetchLatestBestsellers();

        foreach ($books as $dto) {
            try {
                $result = $this->ingestBook($dto);

                if ($result === 'imported') {
                    $results['imported']++;
                } elseif ($result === 'updated') {
                    $results['updated']++;
                } else {
                    $results['skipped']++;
                }
            } catch (\Exception $e) {
                $results['errors'][] = "{$dto->title}: {$e->getMessage()}";
            }
        }

        Log::info('[NYTBestseller] Weekly sync complete', $results);

        return $results;
    }

    /**
     * Ingest a single NYT book into the catalog.
     *
     * @return string 'imported', 'updated', or 'skipped'
     */
    private function ingestBook(NYTBookDTO $dto): string
    {
        return DB::transaction(function () use ($dto) {
            $existing = CatalogBook::where('isbn13', $dto->isbn13)->first();

            if ($existing) {
                return $this->updateNytData($existing, $dto);
            }

            $this->createCatalogBook($dto);

            return 'imported';
        });
    }

    /**
     * Create a new catalog book from NYT data.
     */
    private function createCatalogBook(NYTBookDTO $dto): CatalogBook
    {
        $catalogDto = $dto->toCatalogBookDTO();
        $bookData = $catalogDto->toArray();

        $bookData['is_nyt_bestseller'] = true;
        $bookData['nyt_list_category'] = $dto->nytListCategory;
        $bookData['nyt_weeks_on_list'] = $dto->weeksOnList;
        $bookData['nyt_peak_rank'] = $dto->rank;
        $bookData['nyt_first_seen_date'] = $this->parseDate($dto->firstSeenDate);
        $bookData['popularity_score'] = $this->computeNytPopularityScore($dto);
        $bookData['created_at'] = now();
        $bookData['updated_at'] = now();

        $genres = $bookData['genres'];
        unset($bookData['genres']);
        $bookData['genres'] = $genres ? json_encode($genres) : null;

        $id = DB::table('catalog_books')->insertGetId($bookData);

        Log::debug('[NYTBestseller] Created catalog book', [
            'id' => $id,
            'title' => $dto->title,
            'isbn13' => $dto->isbn13,
        ]);

        return CatalogBook::find($id);
    }

    /**
     * Update NYT data for an existing catalog book.
     *
     * @return string 'updated' or 'skipped'
     */
    private function updateNytData(CatalogBook $book, NYTBookDTO $dto): string
    {
        $updates = [];

        if (! $book->is_nyt_bestseller) {
            $updates['is_nyt_bestseller'] = true;
            $updates['nyt_first_seen_date'] = $this->parseDate($dto->firstSeenDate);
        }

        if ($dto->weeksOnList !== null) {
            $currentWeeks = $book->nyt_weeks_on_list ?? 0;
            if ($dto->weeksOnList > $currentWeeks) {
                $updates['nyt_weeks_on_list'] = $dto->weeksOnList;
            }
        }

        if ($dto->rank !== null) {
            $currentPeak = $book->nyt_peak_rank;
            if ($currentPeak === null || $dto->rank < $currentPeak) {
                $updates['nyt_peak_rank'] = $dto->rank;
            }
        }

        if (empty($book->nyt_list_category) && ! empty($dto->nytListCategory)) {
            $updates['nyt_list_category'] = $dto->nytListCategory;
        }

        if (empty($book->cover_url) && ! empty($dto->coverUrl)) {
            $updates['cover_url'] = $dto->coverUrl;
        }

        if (empty($book->description) && ! empty($dto->description)) {
            $updates['description'] = $dto->description;
        }

        if (empty($updates)) {
            return 'skipped';
        }

        $updates['updated_at'] = now();
        $updates['popularity_score'] = max(
            $book->popularity_score,
            $this->computeNytPopularityScore($dto)
        );

        $book->update($updates);

        Log::debug('[NYTBestseller] Updated catalog book', [
            'id' => $book->id,
            'title' => $book->title,
            'updates' => array_keys($updates),
        ]);

        return 'updated';
    }

    /**
     * Fetch a single bestseller list from NYT API.
     *
     * @return array<NYTBookDTO>
     */
    private function fetchList(string $listName, string $date): array
    {
        $apiKey = config('services.nyt.api_key');
        $baseUrl = config('services.nyt.base_url', 'https://api.nytimes.com/svc/books/v3');

        $response = Http::timeout(30)
            ->retry(2, 1000)
            ->get("{$baseUrl}/lists/{$date}/{$listName}.json", [
                'api-key' => $apiKey,
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException("NYT API error: {$response->status()}");
        }

        $data = $response->json();
        $books = $data['results']['books'] ?? [];

        return array_map(
            fn ($book) => NYTBookDTO::fromApiResponse($book, $data['results']['list_name'] ?? $listName, $date),
            $books
        );
    }

    /**
     * Compute popularity score for NYT bestseller.
     *
     * NYT bestsellers get a boost based on rank and weeks on list.
     */
    private function computeNytPopularityScore(NYTBookDTO $dto): float
    {
        $baseScore = 50.0;
        $rankBoost = $dto->rank ? max(0, 20 - $dto->rank) : 0;
        $weeksBoost = $dto->weeksOnList ? min($dto->weeksOnList * 0.5, 30) : 0;

        return $baseScore + $rankBoost + $weeksBoost;
    }

    /**
     * Check if NYT API is configured.
     */
    public function isApiEnabled(): bool
    {
        return ! empty(config('services.nyt.api_key'));
    }

    /**
     * Get rate limit delay in seconds.
     */
    private function getRateLimitDelay(): int
    {
        return (int) config('services.nyt.rate_limit_delay', 6);
    }

    /**
     * Parse date string to Y-m-d format.
     */
    private function parseDate(?string $date): ?string
    {
        if ($date === null) {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Get available NYT list categories for frontend.
     *
     * @return array<int, array{value: string, label: string}>
     */
    public function getListCategories(): array
    {
        return NYTListCategoryEnum::options();
    }

    /**
     * Get statistics about NYT books in the catalog.
     *
     * @return array{total: int, fiction: int, nonfiction: int, avg_weeks: float}
     */
    public function getStats(): array
    {
        $total = CatalogBook::where('is_nyt_bestseller', true)->count();
        $fiction = CatalogBook::where('is_nyt_bestseller', true)
            ->where('nyt_list_category', 'LIKE', '%Fiction%')
            ->count();
        $nonfiction = CatalogBook::where('is_nyt_bestseller', true)
            ->where('nyt_list_category', 'LIKE', '%Nonfiction%')
            ->count();
        $avgWeeks = CatalogBook::where('is_nyt_bestseller', true)
            ->whereNotNull('nyt_weeks_on_list')
            ->avg('nyt_weeks_on_list') ?? 0;

        return [
            'total' => $total,
            'fiction' => $fiction,
            'nonfiction' => $nonfiction,
            'avg_weeks' => round((float) $avgWeeks, 1),
        ];
    }
}
