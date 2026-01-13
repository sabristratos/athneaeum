<?php

declare(strict_types=1);

namespace App\Services\BookSearch;

use App\Contracts\BookSearchServiceInterface;
use App\Exceptions\BookSearchException;
use App\Services\BookSearch\Concerns\HasResilientHttp;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OPDS (Open Publication Distribution System) catalog search service.
 *
 * Connects to Calibre-web or other OPDS-compatible servers to search
 * for books in user's personal library.
 */
class OPDSService implements BookSearchServiceInterface
{
    use HasResilientHttp;

    private const CACHE_TTL_MINUTES = 5;

    private string $serverUrl;

    private ?string $username;

    private ?string $password;

    public function __construct(string $serverUrl, ?string $username = null, ?string $password = null)
    {
        $this->serverUrl = rtrim($serverUrl, '/');
        $this->username = $username;
        $this->password = $password;
    }

    /**
     * @throws BookSearchException
     */
    public function search(
        string $query,
        int $limit = 20,
        int $startIndex = 0,
        ?string $langRestrict = null,
        ?array $genres = null,
        ?float $minRating = null,
        ?int $yearFrom = null,
        ?int $yearTo = null
    ): array {
        $this->checkRateLimit('opds-api');
        $this->checkCircuitBreaker('opds');

        $cacheKey = $this->buildCacheKey('search', $query, $limit, $startIndex);

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use (
            $query,
            $limit,
            $startIndex,
            $langRestrict,
            $genres,
            $minRating,
            $yearFrom,
            $yearTo
        ) {
            return $this->executeSearch($query, $limit, $startIndex, $langRestrict, $genres, $minRating, $yearFrom, $yearTo);
        });
    }

    public function findByExternalId(string $externalId): ?array
    {
        $cacheKey = $this->buildCacheKey('book', $externalId);

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($externalId) {
            $response = $this->makeRequest($this->serverUrl.'/opds/book/'.$externalId);

            if (! $response) {
                return null;
            }

            $entries = $this->parseAtomFeed($response);

            return ! empty($entries) ? $entries[0] : null;
        });
    }

    public function searchEditions(string $title, string $author, int $limit = 20): array
    {
        $query = $title.' '.$author;
        $result = $this->search($query, $limit);

        return $result['items'] ?? [];
    }

    public function getProviderName(): string
    {
        return 'opds';
    }

    private function buildCacheKey(string $type, ...$params): string
    {
        $serverHash = md5($this->serverUrl);

        return "opds.{$serverHash}.{$type}.".md5(serialize($params));
    }

    private function executeSearch(
        string $query,
        int $limit,
        int $startIndex,
        ?string $langRestrict,
        ?array $genres,
        ?float $minRating,
        ?int $yearFrom,
        ?int $yearTo
    ): array {
        $searchUrl = $this->buildSearchUrl($query);

        $response = $this->makeRequest($searchUrl);

        if (! $response) {
            return [
                'items' => [],
                'totalItems' => 0,
                'startIndex' => $startIndex,
                'hasMore' => false,
            ];
        }

        $entries = $this->parseAtomFeed($response);

        $filtered = collect($entries)
            ->when($langRestrict, function ($collection) use ($langRestrict) {
                return $collection->filter(function ($book) use ($langRestrict) {
                    $bookLang = $book['language'] ?? '';

                    return empty($bookLang) || str_starts_with($bookLang, $langRestrict);
                });
            })
            ->when($yearFrom || $yearTo, function ($collection) use ($yearFrom, $yearTo) {
                return $collection->filter(function ($book) use ($yearFrom, $yearTo) {
                    $year = $this->extractYear($book['published_date'] ?? null);
                    if (! $year) {
                        return true;
                    }
                    if ($yearFrom && $year < $yearFrom) {
                        return false;
                    }
                    if ($yearTo && $year > $yearTo) {
                        return false;
                    }

                    return true;
                });
            })
            ->when(! empty($genres), function ($collection) use ($genres) {
                return $collection->filter(function ($book) use ($genres) {
                    $bookGenres = array_map('strtolower', $book['genres'] ?? []);
                    foreach ($genres as $genre) {
                        foreach ($bookGenres as $bookGenre) {
                            if (str_contains($bookGenre, strtolower($genre))) {
                                return true;
                            }
                        }
                    }

                    return empty($genres) || empty($bookGenres);
                });
            });

        $total = $filtered->count();
        $items = $filtered
            ->slice($startIndex, $limit)
            ->values()
            ->all();

        return [
            'items' => $items,
            'totalItems' => $total,
            'startIndex' => $startIndex,
            'hasMore' => ($startIndex + count($items)) < $total,
        ];
    }

    private function buildSearchUrl(string $query): string
    {
        $encodedQuery = rawurlencode($query);

        $possibleEndpoints = [
            '/opds/search?query='.$encodedQuery,
            '/opds/search/'.$encodedQuery,
            '/search?query='.$encodedQuery,
        ];

        return $this->serverUrl.$possibleEndpoints[0];
    }

    private function makeRequest(string $url): ?string
    {
        $timeout = $this->getTimeout();

        try {
            $response = $this->executeWithRetry('opds', function () use ($url, $timeout) {
                $request = Http::timeout($timeout)
                    ->withHeaders([
                        'Accept' => 'application/atom+xml, application/xml, text/xml',
                    ]);

                if ($this->username && $this->password) {
                    $request = $request->withBasicAuth($this->username, $this->password);
                }

                return $request->get($url);
            });

            if (! $response->successful()) {
                Log::warning('OPDS request failed', [
                    'url' => $url,
                    'status' => $response->status(),
                ]);

                return null;
            }

            return $response->body();
        } catch (BookSearchException $e) {
            Log::error('OPDS request failed after retries', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('OPDS request exception', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function parseAtomFeed(string $xml): array
    {
        try {
            $feed = simplexml_load_string($xml);
            if ($feed === false) {
                return [];
            }

            $feed->registerXPathNamespace('atom', 'http://www.w3.org/2005/Atom');
            $feed->registerXPathNamespace('dc', 'http://purl.org/dc/terms/');
            $feed->registerXPathNamespace('opds', 'http://opds-spec.org/2010/catalog');

            $entries = $feed->xpath('//atom:entry');
            if (! $entries) {
                $entries = $feed->entry ?? [];
            }

            $books = [];
            foreach ($entries as $entry) {
                $book = $this->parseEntry($entry);
                if ($book) {
                    $books[] = $book;
                }
            }

            return $books;
        } catch (\Exception $e) {
            Log::error('OPDS parse error', ['error' => $e->getMessage()]);

            return [];
        }
    }

    private function parseEntry(\SimpleXMLElement $entry): ?array
    {
        $entry->registerXPathNamespace('atom', 'http://www.w3.org/2005/Atom');
        $entry->registerXPathNamespace('dc', 'http://purl.org/dc/terms/');
        $entry->registerXPathNamespace('opds', 'http://opds-spec.org/2010/catalog');

        $title = (string) $entry->title;
        if (empty($title)) {
            return null;
        }

        $authors = [];
        foreach ($entry->author as $author) {
            $name = (string) $author->name;
            if (! empty($name)) {
                $authors[] = $name;
            }
        }

        $coverUrl = null;
        foreach ($entry->link as $link) {
            $rel = (string) $link['rel'];
            $type = (string) $link['type'];

            if (str_contains($rel, 'image') || str_contains($rel, 'thumbnail') || str_contains($rel, 'cover')) {
                $coverUrl = (string) $link['href'];
                if (! str_starts_with($coverUrl, 'http')) {
                    $coverUrl = $this->serverUrl.'/'.ltrim($coverUrl, '/');
                }
                break;
            }

            if (str_starts_with($type, 'image/')) {
                $coverUrl = (string) $link['href'];
                if (! str_starts_with($coverUrl, 'http')) {
                    $coverUrl = $this->serverUrl.'/'.ltrim($coverUrl, '/');
                }
            }
        }

        $dcIdentifier = $entry->xpath('dc:identifier');
        $isbn = null;
        if (! empty($dcIdentifier)) {
            foreach ($dcIdentifier as $id) {
                $idStr = (string) $id;
                if (str_starts_with($idStr, 'urn:isbn:')) {
                    $isbn = substr($idStr, 9);
                    break;
                }
                if (preg_match('/^(978|979)?\d{9,13}[\dXx]?$/', preg_replace('/[\s\-]/', '', $idStr))) {
                    $isbn = preg_replace('/[\s\-]/', '', $idStr);
                    break;
                }
            }
        }

        $externalId = (string) $entry->id;
        if (empty($externalId)) {
            $externalId = md5($title.implode('', $authors));
        }

        $dcSubjects = $entry->xpath('dc:subject');
        $genres = [];
        if (! empty($dcSubjects)) {
            foreach ($dcSubjects as $subject) {
                $genres[] = (string) $subject;
            }
        }
        foreach ($entry->category as $category) {
            $term = (string) $category['term'];
            if (! empty($term) && ! in_array($term, $genres, true)) {
                $genres[] = $term;
            }
        }

        $dcDescription = $entry->xpath('dc:description');
        $description = ! empty($dcDescription) ? (string) $dcDescription[0] : ((string) $entry->summary ?: null);
        if ($description) {
            $description = strip_tags($description);
        }

        $dcDate = $entry->xpath('dc:date');
        $publishedDate = ! empty($dcDate) ? $this->parsePublishedDate((string) $dcDate[0]) : null;
        if (! $publishedDate && ! empty($entry->published)) {
            $publishedDate = $this->parsePublishedDate((string) $entry->published);
        }

        $dcLanguage = $entry->xpath('dc:language');
        $language = ! empty($dcLanguage) ? (string) $dcLanguage[0] : null;

        return [
            'external_id' => $externalId,
            'title' => $title,
            'author' => ! empty($authors) ? implode(', ', $authors) : 'Unknown Author',
            'cover_url' => $coverUrl,
            'page_count' => null,
            'isbn' => $isbn,
            'description' => $description,
            'genres' => $genres,
            'published_date' => $publishedDate,
            'average_rating' => null,
            'ratings_count' => null,
            'language' => $language,
        ];
    }

    private function parsePublishedDate(?string $date): ?string
    {
        if (! $date) {
            return null;
        }

        if (preg_match('/^\d{4}$/', $date)) {
            return $date.'-01-01';
        }

        if (preg_match('/^\d{4}-\d{2}$/', $date)) {
            return $date.'-01';
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $date)) {
            return substr($date, 0, 10);
        }

        return $date;
    }

    private function extractYear(?string $date): ?int
    {
        if (! $date) {
            return null;
        }

        if (preg_match('/^(\d{4})/', $date, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    /**
     * Test connection to OPDS server.
     */
    public function testConnection(): array
    {
        $rootUrl = $this->serverUrl.'/opds';
        $response = $this->makeRequest($rootUrl);

        if (! $response) {
            return [
                'success' => false,
                'message' => 'Could not connect to OPDS server',
            ];
        }

        try {
            $feed = simplexml_load_string($response);
            if ($feed === false) {
                return [
                    'success' => false,
                    'message' => 'Invalid OPDS feed format',
                ];
            }

            $title = (string) ($feed->title ?? 'OPDS Catalog');

            return [
                'success' => true,
                'message' => 'Connected successfully',
                'catalog_title' => $title,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to parse OPDS feed: '.$e->getMessage(),
            ];
        }
    }
}
