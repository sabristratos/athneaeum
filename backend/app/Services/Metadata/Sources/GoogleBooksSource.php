<?php

declare(strict_types=1);

namespace App\Services\Metadata\Sources;

use App\DTOs\Metadata\MetadataQueryDTO;
use App\DTOs\Metadata\MetadataResultDTO;
use App\Services\BookSearch\GoogleBooksService;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;

/**
 * Google Books metadata source adapter.
 */
class GoogleBooksSource extends AbstractMetadataSource
{
    private const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

    public function __construct(
        private readonly GoogleBooksService $service
    ) {}

    public function getSourceName(): string
    {
        return 'google_books';
    }

    public function getPriority(): int
    {
        return (int) config('metadata.sources.google_books.priority', 20);
    }

    public function isAvailable(): bool
    {
        return !empty(config('services.google_books.key'));
    }

    protected function lookupByIsbn(string $isbn): ?MetadataResultDTO
    {
        $data = $this->service->lookupForEnrichment($isbn, '', '');

        return $data ? $this->toResultDTO($data, true) : null;
    }

    protected function searchByTitleAuthor(string $title, ?string $author): ?MetadataResultDTO
    {
        $data = $this->service->lookupForEnrichment(null, $title, $author ?? '');

        return $data ? $this->toResultDTO($data, false) : null;
    }

    public function prepareAsyncQuery(MetadataQueryDTO $query): ?callable
    {
        if (!$this->isAvailable()) {
            return null;
        }

        $timeout = (int) config('metadata.parallel.timeout', 15);

        return function (Pool $pool) use ($query, $timeout) {
            $params = [
                'key' => config('services.google_books.key'),
                'maxResults' => 5,
            ];

            if ($query->hasIsbn()) {
                $isbn = $this->cleanIsbn($query->getPrimaryIsbn());
                $params['q'] = "isbn:{$isbn}";
            } else {
                $q = 'intitle:"'.$query->title.'"';

                if ($query->author) {
                    $author = explode(',', $query->author)[0];
                    $q .= ' inauthor:"'.trim($author).'"';
                }

                $params['q'] = $q;
            }

            return $pool->timeout($timeout)->get(self::BASE_URL, $params);
        };
    }

    public function parseAsyncResponse(mixed $response): ?MetadataResultDTO
    {
        if (!$response instanceof Response || !$response->successful()) {
            return null;
        }

        $items = $response->json('items', []);

        if (empty($items)) {
            return null;
        }

        $transformed = $this->transformItem($items[0]);

        return $this->toResultDTO($transformed, false);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function toResultDTO(array $data, bool $isIdentifierMatch): MetadataResultDTO
    {
        $isbn = $data['isbn'] ?? null;
        $isbn13 = null;

        if ($isbn && strlen($isbn) === 13) {
            $isbn13 = $isbn;
        }

        return new MetadataResultDTO(
            source: 'google_books',
            isIdentifierMatch: $isIdentifierMatch,
            title: $data['title'] ?? null,
            author: $data['author'] ?? null,
            description: $data['description'] ?? null,
            coverUrl: $data['cover_url'] ?? null,
            pageCount: isset($data['page_count']) ? (int) $data['page_count'] : null,
            publishedDate: $data['published_date'] ?? null,
            publisher: $data['publisher'] ?? null,
            isbn: $isbn,
            isbn13: $isbn13,
            genres: $data['genres'] ?? null,
            seriesName: $data['series_name'] ?? null,
            volumeNumber: isset($data['volume_number']) ? (int) $data['volume_number'] : null,
            externalId: $data['external_id'] ?? null,
            averageRating: isset($data['average_rating']) ? (float) $data['average_rating'] : null,
            ratingsCount: isset($data['ratings_count']) ? (int) $data['ratings_count'] : null,
        );
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function transformItem(array $item): array
    {
        $volumeInfo = $item['volumeInfo'] ?? [];

        $coverUrl = $volumeInfo['imageLinks']['thumbnail']
            ?? $volumeInfo['imageLinks']['smallThumbnail']
            ?? null;

        if ($coverUrl) {
            $coverUrl = str_replace('http://', 'https://', $coverUrl);
        }

        $seriesInfo = $this->extractSeriesInfo($volumeInfo);

        return [
            'external_id' => $item['id'] ?? null,
            'title' => $volumeInfo['title'] ?? null,
            'author' => isset($volumeInfo['authors'])
                ? implode(', ', $volumeInfo['authors'])
                : null,
            'description' => $volumeInfo['description'] ?? null,
            'cover_url' => $coverUrl,
            'page_count' => $volumeInfo['pageCount'] ?? null,
            'published_date' => $this->parsePublishedDate($volumeInfo['publishedDate'] ?? null),
            'publisher' => $volumeInfo['publisher'] ?? null,
            'isbn' => $this->extractIsbn($volumeInfo),
            'genres' => $volumeInfo['categories'] ?? null,
            'average_rating' => $volumeInfo['averageRating'] ?? null,
            'ratings_count' => $volumeInfo['ratingsCount'] ?? null,
            'series_name' => $seriesInfo['name'],
            'volume_number' => $seriesInfo['volume'],
        ];
    }

    /**
     * @param  array<string, mixed>  $volumeInfo
     */
    private function extractIsbn(array $volumeInfo): ?string
    {
        $identifiers = $volumeInfo['industryIdentifiers'] ?? [];

        foreach ($identifiers as $identifier) {
            if ($identifier['type'] === 'ISBN_13') {
                return $identifier['identifier'];
            }
        }

        foreach ($identifiers as $identifier) {
            if ($identifier['type'] === 'ISBN_10') {
                return $identifier['identifier'];
            }
        }

        return null;
    }

    private function parsePublishedDate(?string $date): ?string
    {
        if (!$date) {
            return null;
        }

        if (preg_match('/^\d{4}$/', $date)) {
            return $date.'-01-01';
        }

        if (preg_match('/^\d{4}-\d{2}$/', $date)) {
            return $date.'-01';
        }

        return $date;
    }

    /**
     * Extract series information from Google Books volumeInfo.
     *
     * @param  array<string, mixed>  $volumeInfo
     * @return array{name: string|null, volume: int|null}
     */
    private function extractSeriesInfo(array $volumeInfo): array
    {
        $result = ['name' => null, 'volume' => null];

        if (isset($volumeInfo['seriesInfo'])) {
            $seriesInfo = $volumeInfo['seriesInfo'];

            if (isset($seriesInfo['bookDisplayNumber'])) {
                $result['volume'] = (int) $seriesInfo['bookDisplayNumber'];
            }

            if (isset($seriesInfo['volumeSeries'][0]['seriesId'])) {
                $result['name'] = $seriesInfo['volumeSeries'][0]['seriesId'];
            }
        }

        if (!$result['name'] && isset($volumeInfo['title'])) {
            $title = $volumeInfo['title'];

            if (preg_match('/^(.+?)\s*[,:]?\s*(?:Book|Volume|Part|#)\s*(\d+)/i', $title, $matches)) {
                $result['name'] = trim($matches[1]);
                $result['volume'] = (int) $matches[2];
            }
        }

        return $result;
    }
}
