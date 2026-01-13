<?php

declare(strict_types=1);

namespace App\Services\Ingestion;

use App\Contracts\BookIngestionServiceInterface;
use App\DTOs\Ingestion\CleanBookDTO;
use App\DTOs\Ingestion\RawBookDTO;
use App\DTOs\Ingestion\SanitizationResultDTO;
use App\Enums\MoodEnum;
use App\Models\Book;
use App\Models\Series;
use App\Services\Ingestion\LLM\LLMConsultant;
use App\Services\Ingestion\Resolvers\AuthorResolver;
use App\Services\Ingestion\Resolvers\GenreMapper;
use App\Services\Ingestion\Resolvers\PublisherResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Main entry point for all book data entering the system.
 *
 * Orchestrates the "Air Lock" ingestion pipeline:
 * 1. Sanitize raw data (Level 1: Code)
 * 2. Resolve LLM decisions if needed (Level 2: LLM)
 * 3. Resolve entities (authors, genres, publishers, series)
 * 4. Persist to database
 */
class BookIngestionService implements BookIngestionServiceInterface
{
    public function __construct(
        private readonly DataSanitizer $sanitizer,
        private readonly AuthorResolver $authorResolver,
        private readonly GenreMapper $genreMapper,
        private readonly PublisherResolver $publisherResolver,
        private readonly LLMConsultant $llmConsultant,
    ) {}

    /**
     * {@inheritdoc}
     */
    public function ingest(RawBookDTO $raw, bool $allowUpdate = true): Book
    {
        $source = $raw->externalProvider ?? 'unknown';

        $result = $this->sanitizer->sanitize($raw, $source);

        if ($result->hasLLMDecisions() && config('ingestion.llm.enabled', false)) {
            $result = $this->handleLLMDecisions($result);
        }

        return DB::transaction(function () use ($raw, $result, $allowUpdate) {
            $clean = $result->book;

            $existing = $this->findExistingBook($raw);

            if ($existing) {
                if (! $allowUpdate || ! $existing->canUpdateFromExternal()) {
                    return $existing;
                }

                return $this->updateBook($existing, $clean);
            }

            return $this->createBook($clean, $result->needsGenreEnrichment);
        });
    }

    /**
     * {@inheritdoc}
     */
    public function ingestBatch(array $rawBooks): array
    {
        $books = [];
        $errors = [];

        foreach ($rawBooks as $index => $raw) {
            try {
                $books[] = $this->ingest($raw);
            } catch (\Exception $e) {
                $errors[] = "Book {$index}: {$e->getMessage()}";
                Log::warning('Book ingestion failed', [
                    'index' => $index,
                    'title' => $raw->title,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'books' => $books,
            'errors' => $errors,
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function updateFromExternal(Book $book, RawBookDTO $raw): Book
    {
        if (! $book->canUpdateFromExternal()) {
            return $book;
        }

        $source = $raw->externalProvider ?? 'unknown';
        $result = $this->sanitizer->sanitize($raw, $source);

        if ($result->hasLLMDecisions() && config('ingestion.llm.enabled', false)) {
            $result = $this->handleLLMDecisions($result);
        }

        return DB::transaction(fn () => $this->updateBook($book, $result->book));
    }

    /**
     * Find an existing book by external ID or ISBN.
     */
    private function findExistingBook(RawBookDTO $raw): ?Book
    {
        if ($raw->externalId && $raw->externalProvider) {
            $book = Book::where('external_id', $raw->externalId)
                ->where('external_provider', $raw->externalProvider)
                ->first();

            if ($book) {
                return $book;
            }
        }

        if ($raw->isbn13) {
            $book = Book::where('isbn13', $raw->isbn13)->first();
            if ($book) {
                return $book;
            }
        }

        if ($raw->isbn) {
            $book = Book::where('isbn', $raw->isbn)->first();
            if ($book) {
                return $book;
            }
        }

        return null;
    }

    /**
     * Create a new book with all relationships.
     */
    private function createBook(CleanBookDTO $clean, bool $needsGenreEnrichment = false): Book
    {
        $publisherId = null;
        if ($clean->publisherName) {
            $publisher = $this->publisherResolver->findOrCreate($clean->publisherName);
            $publisherId = $publisher->id;
        }

        $seriesId = null;
        if ($clean->seriesName) {
            Log::info('[BookIngestion] Series detected in title', [
                'seriesName' => $clean->seriesName,
                'volumeNumber' => $clean->volumeNumber,
                'title' => $clean->title,
            ]);

            $series = $this->findOrCreateSeries($clean);
            $seriesId = $series?->id;

            Log::info('[BookIngestion] Series created/found', [
                'seriesId' => $seriesId,
                'seriesTitle' => $series?->title,
            ]);
        }

        Log::info('[BookIngestion] Processing genres', [
            'rawGenres' => $clean->rawGenres,
            'externalProvider' => $clean->externalProvider,
            'needsGenreEnrichment' => $needsGenreEnrichment,
        ]);

        $genres = [];

        if ($needsGenreEnrichment && config('ingestion.llm.enabled', false)) {
            Log::info('[BookIngestion] Attempting LLM genre enrichment', [
                'title' => $clean->title,
            ]);

            $genres = $this->llmConsultant->enrichGenresFromContent(
                $clean->title,
                $clean->description,
                $clean->getPrimaryAuthorName(),
                $clean->externalProvider ?? 'unknown'
            );

            Log::info('[BookIngestion] LLM genre enrichment result', [
                'enrichedGenres' => array_map(fn ($g) => $g->name, $genres),
            ]);
        }

        if (empty($genres)) {
            $genreResult = $this->genreMapper->map(
                $clean->rawGenres,
                $clean->externalProvider ?? 'unknown'
            );
            $genres = $genreResult['genres'];

            Log::info('[BookIngestion] Genre mapping complete', [
                'mappedGenres' => array_map(fn ($g) => $g->name, $genres),
                'unmapped' => $genreResult['unmapped'] ?? [],
            ]);
        }

        $book = Book::create([
            'title' => $clean->title,
            'author' => $clean->getPrimaryAuthorName(),
            'description' => $clean->description,
            'genres' => ! empty($clean->rawGenres) ? $clean->rawGenres : null,
            'isbn' => $clean->isbn,
            'isbn13' => $clean->isbn13,
            'page_count' => $clean->pageCount,
            'published_date' => $clean->publishedDate,
            'publisher_id' => $publisherId,
            'cover_url' => $clean->coverUrl,
            'external_id' => $clean->externalId,
            'external_provider' => $clean->externalProvider,
            'series_id' => $seriesId,
            'volume_number' => $clean->volumeNumber,
            'height_cm' => $clean->heightCm,
            'width_cm' => $clean->widthCm,
            'thickness_cm' => $clean->thicknessCm,
            'is_locked' => false,
        ]);

        $this->attachAuthors($book, $clean->authors);

        Log::info('[BookIngestion] Attaching genres to book', [
            'bookId' => $book->id,
            'genreCount' => count($genres),
            'genreIds' => array_map(fn ($g) => $g->id, $genres),
        ]);

        $this->attachGenres($book, $genres);

        Log::info('[BookIngestion] Book created successfully', [
            'bookId' => $book->id,
            'title' => $book->title,
        ]);

        $this->classifyBookContent($book, $clean);

        return $book->fresh(['authors', 'genreRelations', 'publisher', 'series']);
    }

    /**
     * Update an existing book.
     */
    private function updateBook(Book $book, CleanBookDTO $clean): Book
    {
        $updates = [];

        if ($clean->description && ! $book->description) {
            $updates['description'] = $clean->description;
        }

        if ($clean->coverUrl && ! $book->cover_url) {
            $updates['cover_url'] = $clean->coverUrl;
        }

        if ($clean->pageCount && ! $book->page_count) {
            $updates['page_count'] = $clean->pageCount;
        }

        if ($clean->isbn && ! $book->isbn) {
            $updates['isbn'] = $clean->isbn;
        }

        if ($clean->isbn13 && ! $book->isbn13) {
            $updates['isbn13'] = $clean->isbn13;
        }

        if ($clean->publishedDate && ! $book->published_date) {
            $updates['published_date'] = $clean->publishedDate;
        }

        if (! empty($updates)) {
            $book->update($updates);
        }

        return $book->fresh();
    }

    /**
     * Handle LLM decisions for ambiguous data.
     */
    private function handleLLMDecisions(SanitizationResultDTO $result): SanitizationResultDTO
    {
        foreach ($result->llmDecisions as $decision) {
            if ($decision['type'] === 'genre') {
                $genre = $this->llmConsultant->resolveGenre(
                    $decision['data']['genre'],
                    $decision['data']['source']
                );

                if ($genre) {
                    $rawGenres = $result->book->rawGenres;

                    $result->book = new CleanBookDTO(
                        title: $result->book->title,
                        authors: $result->book->authors,
                        description: $result->book->description,
                        rawGenres: $rawGenres,
                        isbn: $result->book->isbn,
                        isbn13: $result->book->isbn13,
                        pageCount: $result->book->pageCount,
                        publishedDate: $result->book->publishedDate,
                        publisherName: $result->book->publisherName,
                        coverUrl: $result->book->coverUrl,
                        externalId: $result->book->externalId,
                        externalProvider: $result->book->externalProvider,
                        seriesId: $result->book->seriesId,
                        seriesName: $result->book->seriesName,
                        volumeNumber: $result->book->volumeNumber,
                        heightCm: $result->book->heightCm,
                        widthCm: $result->book->widthCm,
                        thicknessCm: $result->book->thicknessCm,
                        language: $result->book->language,
                    );
                }
            }
        }

        return $result;
    }

    /**
     * Attach authors to a book.
     *
     * @param  array<\App\DTOs\Ingestion\AuthorDTO>  $authorDTOs
     */
    private function attachAuthors(Book $book, array $authorDTOs): void
    {
        $pivotData = [];

        foreach ($authorDTOs as $position => $dto) {
            $author = $this->authorResolver->findOrCreate($dto);
            $pivotData[$author->id] = [
                'role' => $dto->role,
                'position' => $position,
            ];
        }

        $book->authors()->sync($pivotData);
    }

    /**
     * Attach genres to a book.
     *
     * @param  array<\App\Models\Genre>  $genres
     */
    private function attachGenres(Book $book, array $genres): void
    {
        $pivotData = [];

        foreach ($genres as $index => $genre) {
            $pivotData[$genre->id] = [
                'is_primary' => $index === 0,
            ];
        }

        $book->genreRelations()->sync($pivotData);
    }

    /**
     * Find or create a series.
     */
    private function findOrCreateSeries(CleanBookDTO $clean): ?Series
    {
        if (! $clean->seriesName) {
            return null;
        }

        $authorName = $clean->getPrimaryAuthorName();

        return Series::firstOrCreate(
            [
                'title' => $clean->seriesName,
                'author' => $authorName,
            ],
            [
                'external_provider' => $clean->externalProvider,
            ]
        );
    }

    /**
     * Classify book content using LLM.
     *
     * Auto-classifies audience, intensity, and moods if enabled.
     */
    private function classifyBookContent(Book $book, CleanBookDTO $clean): void
    {
        if (! config('ingestion.classification.enabled', true)) {
            return;
        }

        if (! config('ingestion.classification.auto_classify_on_ingest', false)) {
            return;
        }

        if (! $this->llmConsultant->isEnabled()) {
            return;
        }

        if ($book->is_classified) {
            return;
        }

        $minDescriptionLength = config('ingestion.classification.description_min_length', 50);
        if (empty($clean->description) || mb_strlen($clean->description) < $minDescriptionLength) {
            Log::info('[BookIngestion] Skipping classification - description too short', [
                'bookId' => $book->id,
                'descriptionLength' => mb_strlen($clean->description ?? ''),
            ]);

            return;
        }

        try {
            Log::info('[BookIngestion] Starting content classification', [
                'bookId' => $book->id,
                'title' => $book->title,
            ]);

            $result = $this->llmConsultant->classifyBook(
                title: $clean->title,
                description: $clean->description,
                author: $clean->getPrimaryAuthorName(),
                genres: $clean->rawGenres,
                externalId: $clean->externalId,
                externalProvider: $clean->externalProvider,
            );

            $contentClassification = $result['content'];

            if ($contentClassification->confidence > 0) {
                $book->update([
                    'audience' => $contentClassification->audience,
                    'intensity' => $contentClassification->intensity,
                    'moods' => array_map(fn (MoodEnum $m) => $m->value, $contentClassification->moods),
                    'classification_confidence' => $contentClassification->confidence,
                    'is_classified' => true,
                ]);

                Log::info('[BookIngestion] Content classification complete', [
                    'bookId' => $book->id,
                    'audience' => $contentClassification->audience?->value,
                    'intensity' => $contentClassification->intensity?->value,
                    'moods' => array_map(fn (MoodEnum $m) => $m->value, $contentClassification->moods),
                    'confidence' => $contentClassification->confidence,
                ]);
            }
        } catch (\Exception $e) {
            Log::warning('[BookIngestion] Content classification failed', [
                'bookId' => $book->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
