<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Author;
use App\Models\AuthorAlias;
use App\Models\Book;
use App\Models\Genre;
use App\Services\Ingestion\Cleaners\AuthorCleaner;
use App\Services\Ingestion\Resolvers\GenreMapper;
use Illuminate\Console\Command;

/**
 * Migrates existing book data to normalized entity tables.
 *
 * This command should be run after the new migrations to:
 * 1. Seed canonical genres from GenreEnum
 * 2. Parse existing book author strings and create Author records
 * 3. Parse existing book genres JSON and link to Genre records
 */
class MigrateBookEntities extends Command
{
    protected $signature = 'books:migrate-entities
                            {--batch=100 : Number of books to process per batch}
                            {--dry-run : Run without making changes}
                            {--skip-genres : Skip genre migration}
                            {--skip-authors : Skip author migration}';

    protected $description = 'Migrate existing book data to normalized Author and Genre tables';

    private int $authorsCreated = 0;

    private int $authorsLinked = 0;

    private int $genresLinked = 0;

    private int $booksProcessed = 0;

    public function __construct(
        private readonly AuthorCleaner $authorCleaner,
        private readonly GenreMapper $genreMapper,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Starting book entity migration...');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
        }

        if (! $this->option('skip-genres')) {
            $this->seedCanonicalGenres($dryRun);
        }

        if (! $this->option('skip-authors')) {
            $this->migrateAuthors($dryRun);
        }

        if (! $this->option('skip-genres')) {
            $this->migrateGenres($dryRun);
        }

        $this->newLine();
        $this->info('Migration complete!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Books processed', $this->booksProcessed],
                ['Authors created', $this->authorsCreated],
                ['Author links created', $this->authorsLinked],
                ['Genre links created', $this->genresLinked],
            ]
        );

        return Command::SUCCESS;
    }

    /**
     * Seed canonical genres from GenreEnum.
     */
    private function seedCanonicalGenres(bool $dryRun): void
    {
        $this->info('Seeding canonical genres...');

        if ($dryRun) {
            $this->line('  Would seed '.count(\App\Enums\GenreEnum::cases()).' canonical genres');

            return;
        }

        $this->genreMapper->seedCanonicalGenres();
        $this->info('  Seeded '.Genre::count().' canonical genres');
    }

    /**
     * Migrate author strings to Author models.
     */
    private function migrateAuthors(bool $dryRun): void
    {
        $this->info('Migrating authors...');
        $batch = (int) $this->option('batch');

        $bar = $this->output->createProgressBar(Book::count());
        $bar->start();

        Book::query()
            ->whereDoesntHave('authors')
            ->chunk($batch, function ($books) use ($dryRun, $bar) {
                foreach ($books as $book) {
                    $this->migrateBookAuthors($book, $dryRun);
                    $bar->advance();
                }
            });

        $bar->finish();
        $this->newLine();
    }

    /**
     * Migrate a single book's author string.
     */
    private function migrateBookAuthors(Book $book, bool $dryRun): void
    {
        if (empty($book->author)) {
            return;
        }

        $authorDTOs = $this->authorCleaner->clean($book->author);

        if ($dryRun) {
            $this->booksProcessed++;

            return;
        }

        $pivotData = [];

        foreach ($authorDTOs as $position => $dto) {
            $author = Author::firstOrCreate(
                ['slug' => $dto->slug],
                [
                    'name' => $dto->name,
                    'sort_name' => $dto->sortName,
                ]
            );

            if ($author->wasRecentlyCreated) {
                $this->authorsCreated++;

                AuthorAlias::learnAlias(
                    $dto->name,
                    $author,
                    AuthorAlias::TYPE_VARIANT,
                    'migration',
                    true
                );
            }

            $pivotData[$author->id] = [
                'role' => $dto->role,
                'position' => $position,
            ];
        }

        $book->authors()->syncWithoutDetaching($pivotData);
        $this->authorsLinked += count($pivotData);
        $this->booksProcessed++;
    }

    /**
     * Migrate genre JSON to Genre relationships.
     */
    private function migrateGenres(bool $dryRun): void
    {
        $this->info('Migrating genres...');
        $batch = (int) $this->option('batch');

        $bar = $this->output->createProgressBar(
            Book::whereNotNull('genres')->count()
        );
        $bar->start();

        Book::query()
            ->whereNotNull('genres')
            ->whereDoesntHave('genreRelations')
            ->chunk($batch, function ($books) use ($dryRun, $bar) {
                foreach ($books as $book) {
                    $this->migrateBookGenres($book, $dryRun);
                    $bar->advance();
                }
            });

        $bar->finish();
        $this->newLine();
    }

    /**
     * Migrate a single book's genres.
     */
    private function migrateBookGenres(Book $book, bool $dryRun): void
    {
        $genres = $book->genres;

        if (empty($genres) || ! is_array($genres)) {
            return;
        }

        if ($dryRun) {
            return;
        }

        $result = $this->genreMapper->map($genres, $book->external_provider ?? 'migration');

        if (empty($result['genres'])) {
            return;
        }

        $pivotData = [];
        foreach ($result['genres'] as $index => $genre) {
            $pivotData[$genre->id] = ['is_primary' => $index === 0];
        }

        $book->genreRelations()->syncWithoutDetaching($pivotData);
        $this->genresLinked += count($pivotData);
    }
}
