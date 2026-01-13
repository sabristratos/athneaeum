<?php

declare(strict_types=1);

namespace App\Services\Import;

use App\Contracts\BookIngestionServiceInterface;
use App\Contracts\ImportServiceInterface;
use App\DTOs\ImportOptions;
use App\DTOs\ImportResult;
use App\DTOs\Ingestion\RawBookDTO;
use App\Enums\BookFormatEnum;
use App\Enums\BookStatusEnum;
use App\Enums\TagColorEnum;
use App\Jobs\EnrichBookJob;
use App\Models\Book;
use App\Models\Tag;
use App\Models\User;
use App\Models\UserBook;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GoodreadsImportService implements ImportServiceInterface
{
    private const PROVIDER_NAME = 'goodreads';

    public function __construct(
        private readonly BookIngestionServiceInterface $ingestionService
    ) {}

    private const REQUIRED_COLUMNS = ['Book Id', 'Title', 'Author', 'Exclusive Shelf'];

    public function getProviderName(): string
    {
        return self::PROVIDER_NAME;
    }

    public function getSupportedExtensions(): array
    {
        return ['csv', 'txt'];
    }

    public function import(User $user, string $csvPath, ImportOptions $options): ImportResult
    {
        $result = new ImportResult;

        $handle = fopen($csvPath, 'r');
        if ($handle === false) {
            $result->addError('Unable to open CSV file');

            return $result;
        }

        $headers = fgetcsv($handle);
        if ($headers === false) {
            fclose($handle);
            $result->addError('CSV file is empty or invalid');

            return $result;
        }

        $headers = array_map('trim', $headers);

        foreach (self::REQUIRED_COLUMNS as $requiredColumn) {
            if (! in_array($requiredColumn, $headers, true)) {
                fclose($handle);
                $result->addError("Missing required column: {$requiredColumn}");

                return $result;
            }
        }

        $columnMap = array_flip($headers);
        $rowNumber = 1;
        $processedGoodreadsIds = [];
        $importedBookIds = [];

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            try {
                $goodreadsId = $this->getValue($row, $columnMap, 'Book Id');
                $title = $this->getValue($row, $columnMap, 'Title');
                $author = $this->getValue($row, $columnMap, 'Author');
                $shelf = $this->getValue($row, $columnMap, 'Exclusive Shelf');

                if (empty($title) || empty($author)) {
                    $result->addError("Row {$rowNumber}: Missing title or author");

                    continue;
                }

                if (in_array($goodreadsId, $processedGoodreadsIds, true)) {
                    $result->addSkipped();

                    continue;
                }
                $processedGoodreadsIds[] = $goodreadsId;

                $existingUserBook = $this->findExistingUserBook($user, $goodreadsId);
                if ($existingUserBook) {
                    $result->addSkipped();

                    continue;
                }

                $bookId = DB::transaction(function () use ($user, $row, $columnMap, $shelf, $options) {
                    $book = $this->findOrCreateBook($row, $columnMap);
                    $userBook = $this->createUserBook($user, $book, $row, $columnMap, $shelf, $options);

                    if ($options->importTags) {
                        $bookshelves = $this->getValue($row, $columnMap, 'Bookshelves');
                        $this->importBookshelves($user, $userBook, $bookshelves);
                    }

                    return $book->id;
                });

                $importedBookIds[] = $bookId;
                $result->addImported();
            } catch (\Exception $e) {
                Log::warning('Goodreads import error', [
                    'row' => $rowNumber,
                    'error' => $e->getMessage(),
                ]);
                $result->addError("Row {$rowNumber}: {$e->getMessage()}");
            }
        }

        fclose($handle);

        if ($options->enrichmentEnabled) {
            $this->dispatchEnrichmentJobs($importedBookIds);
        }

        return $result;
    }

    private function dispatchEnrichmentJobs(array $bookIds): void
    {
        foreach ($bookIds as $index => $bookId) {
            EnrichBookJob::dispatch($bookId)->delay(now()->addSeconds($index * 2));
        }

        if (count($bookIds) > 0) {
            Log::info('Dispatched book enrichment jobs', ['count' => count($bookIds)]);
        }
    }

    private function getValue(array $row, array $columnMap, string $column): ?string
    {
        if (! isset($columnMap[$column])) {
            return null;
        }

        $value = $row[$columnMap[$column]] ?? null;

        return $value !== null ? trim($value) : null;
    }

    private function findExistingUserBook(User $user, ?string $goodreadsId): ?UserBook
    {
        if (empty($goodreadsId)) {
            return null;
        }

        return UserBook::query()
            ->where('user_id', $user->id)
            ->whereHas('book', function ($query) use ($goodreadsId) {
                $query->where('external_id', $goodreadsId)
                    ->where('external_provider', self::PROVIDER_NAME);
            })
            ->first();
    }

    private function findOrCreateBook(array $row, array $columnMap): Book
    {
        $rawBookDTO = RawBookDTO::fromGoodreadsRow($row, $columnMap);

        return $this->ingestionService->ingest($rawBookDTO);
    }

    private function createUserBook(
        User $user,
        Book $book,
        array $row,
        array $columnMap,
        ?string $shelf,
        ImportOptions $options
    ): UserBook {
        $status = $this->mapStatus($shelf);
        $rating = $this->parseRating($this->getValue($row, $columnMap, 'My Rating'));
        $format = $this->mapFormat($this->getValue($row, $columnMap, 'Binding'));
        $dateRead = $this->parseGoodreadsDate($this->getValue($row, $columnMap, 'Date Read'));
        $dateAdded = $this->parseGoodreadsDate($this->getValue($row, $columnMap, 'Date Added'));

        $review = null;
        if ($options->importReviews) {
            $review = $this->getValue($row, $columnMap, 'My Review');
        }

        $startedAt = null;
        $finishedAt = null;
        $currentPage = 0;

        if ($status === BookStatusEnum::Read) {
            $finishedAt = $dateRead ?? $dateAdded;
            $startedAt = $dateAdded;
            $currentPage = $book->page_count ?? 0;
        } elseif ($status === BookStatusEnum::Reading) {
            $startedAt = $dateAdded;
        }

        return UserBook::create([
            'user_id' => $user->id,
            'book_id' => $book->id,
            'status' => $status,
            'rating' => $rating,
            'format' => $format,
            'current_page' => $currentPage,
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
            'review' => $review,
        ]);
    }

    private function mapStatus(?string $shelf): BookStatusEnum
    {
        return match (strtolower($shelf ?? '')) {
            'to-read' => BookStatusEnum::WantToRead,
            'currently-reading' => BookStatusEnum::Reading,
            'read' => BookStatusEnum::Read,
            default => BookStatusEnum::WantToRead,
        };
    }

    private function mapFormat(?string $binding): ?BookFormatEnum
    {
        if (empty($binding)) {
            return null;
        }

        $binding = strtolower($binding);

        return match (true) {
            str_contains($binding, 'kindle'),
            str_contains($binding, 'ebook'),
            str_contains($binding, 'e-book') => BookFormatEnum::Ebook,

            str_contains($binding, 'audio'),
            str_contains($binding, 'cd') => BookFormatEnum::Audiobook,

            str_contains($binding, 'hardcover'),
            str_contains($binding, 'paperback'),
            str_contains($binding, 'mass market') => BookFormatEnum::Physical,

            default => BookFormatEnum::Physical,
        };
    }

    private function parseGoodreadsDate(?string $date): ?Carbon
    {
        if (empty($date)) {
            return null;
        }

        try {
            return Carbon::createFromFormat('Y/m/d', $date);
        } catch (\Exception) {
            return null;
        }
    }

    private function parseRating(?string $rating): ?float
    {
        if (empty($rating) || ! is_numeric($rating)) {
            return null;
        }

        $value = (float) $rating;

        if ($value <= 0 || $value > 5) {
            return null;
        }

        return $value;
    }

    private function importBookshelves(User $user, UserBook $userBook, ?string $bookshelves): void
    {
        if (empty($bookshelves)) {
            return;
        }

        $shelfNames = array_map('trim', explode(',', $bookshelves));
        $tagIds = [];

        foreach ($shelfNames as $shelfName) {
            if (empty($shelfName)) {
                continue;
            }

            $slug = Str::slug($shelfName);
            if (empty($slug)) {
                continue;
            }

            $formattedName = $this->formatTagName($shelfName);

            $tag = Tag::firstOrCreate(
                ['user_id' => $user->id, 'slug' => $slug],
                [
                    'name' => $formattedName,
                    'color' => $this->assignTagColor($formattedName),
                ]
            );

            $tagIds[] = $tag->id;
        }

        if (! empty($tagIds)) {
            $userBook->tags()->syncWithoutDetaching($tagIds);
        }
    }

    private function formatTagName(string $name): string
    {
        $normalized = str_replace(['-', '_'], ' ', $name);

        return Str::title($normalized);
    }

    private function assignTagColor(string $name): TagColorEnum
    {
        $colors = TagColorEnum::cases();
        $hash = crc32($name);

        return $colors[$hash % count($colors)];
    }
}
