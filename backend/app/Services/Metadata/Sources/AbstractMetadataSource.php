<?php

declare(strict_types=1);

namespace App\Services\Metadata\Sources;

use App\Contracts\Metadata\MetadataSourceInterface;
use App\DTOs\Metadata\MetadataQueryDTO;
use App\DTOs\Metadata\MetadataResultDTO;
use App\Support\IsbnUtility;
use Illuminate\Support\Facades\Log;

/**
 * Base class for metadata source adapters.
 *
 * Provides common functionality for identifier-first lookup logic
 * and error handling. Subclasses implement the actual API calls.
 */
abstract class AbstractMetadataSource implements MetadataSourceInterface
{
    abstract protected function lookupByIsbn(string $isbn): ?MetadataResultDTO;

    abstract protected function searchByTitleAuthor(string $title, ?string $author): ?MetadataResultDTO;

    public function query(MetadataQueryDTO $query): ?MetadataResultDTO
    {
        try {
            if ($query->hasIsbn()) {
                $result = $this->lookupByIsbn($query->getPrimaryIsbn());

                if ($result !== null) {
                    return $result;
                }
            }

            if ($query->hasTitleAuthor()) {
                return $this->searchByTitleAuthor($query->title, $query->author);
            }

            return null;

        } catch (\Exception $e) {
            Log::warning("[{$this->getSourceName()}] Query failed", [
                'error' => $e->getMessage(),
                'query' => $query->title ?? $query->getPrimaryIsbn(),
            ]);

            return null;
        }
    }

    public function supportsAsync(): bool
    {
        return true;
    }

    public function prepareAsyncQuery(MetadataQueryDTO $query): ?callable
    {
        return null;
    }

    public function parseAsyncResponse(mixed $response): ?MetadataResultDTO
    {
        return null;
    }

    public function isAvailable(): bool
    {
        return true;
    }

    protected function cleanIsbn(string $isbn): string
    {
        return IsbnUtility::clean($isbn) ?? $isbn;
    }
}
