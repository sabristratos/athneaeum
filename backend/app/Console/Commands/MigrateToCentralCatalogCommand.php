<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Book;
use App\Models\CatalogBook;
use App\Models\MasterBook;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Migrates existing book data to the unified master_books table.
 *
 * This command imports data from:
 * 1. catalog_books (discovery catalog with embeddings)
 * 2. books (user library books)
 *
 * It then links user_books to the corresponding master_books.
 */
class MigrateToCentralCatalogCommand extends Command
{
    protected $signature = 'catalog:migrate-to-master
        {--catalog : Import from catalog_books table}
        {--library : Import from books table}
        {--link : Link user_books to master_books}
        {--all : Run all migration steps}
        {--dry-run : Show what would be migrated without making changes}';

    protected $description = 'Migrate book data to the unified master_books table';

    private int $imported = 0;

    private int $skipped = 0;

    private int $linked = 0;

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $runAll = $this->option('all');

        if ($dryRun) {
            $this->info('DRY RUN - No changes will be made');
        }

        if ($runAll || $this->option('catalog')) {
            $this->importFromCatalog($dryRun);
        }

        if ($runAll || $this->option('library')) {
            $this->importFromLibrary($dryRun);
        }

        if ($runAll || $this->option('link')) {
            $this->linkUserBooks($dryRun);
        }

        $this->newLine();
        $this->info('Migration Summary:');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Imported', $this->imported],
                ['Skipped (duplicates)', $this->skipped],
                ['User books linked', $this->linked],
                ['Total master_books', MasterBook::count()],
            ]
        );

        return self::SUCCESS;
    }

    /**
     * Import books from catalog_books (discovery catalog).
     */
    private function importFromCatalog(bool $dryRun): void
    {
        $this->info('Importing from catalog_books...');

        $total = CatalogBook::count();
        $this->output->progressStart($total);

        CatalogBook::query()
            ->whereNotNull('isbn13')
            ->orWhereNotNull('isbn')
            ->orderByDesc('popularity_score')
            ->chunk(500, function ($books) use ($dryRun) {
                foreach ($books as $catalogBook) {
                    $this->importCatalogBook($catalogBook, $dryRun);
                    $this->output->progressAdvance();
                }
            });

        $this->output->progressFinish();
        $this->info("Catalog import complete: {$this->imported} imported, {$this->skipped} skipped");
    }

    /**
     * Import a single catalog book.
     */
    private function importCatalogBook(CatalogBook $catalog, bool $dryRun): void
    {
        // Check for existing by ISBN
        $isbn13 = $catalog->isbn13 ?? ($catalog->isbn && strlen($catalog->isbn) === 13 ? $catalog->isbn : null);
        $isbn10 = $catalog->isbn && strlen($catalog->isbn) === 10 ? $catalog->isbn : null;

        if ($isbn13 && MasterBook::where('isbn13', $isbn13)->exists()) {
            $this->skipped++;

            return;
        }

        if ($dryRun) {
            $this->imported++;

            return;
        }

        try {
            $masterBook = MasterBook::create([
                'isbn13' => $isbn13,
                'isbn10' => $isbn10,
                'title' => $catalog->title,
                'author' => $catalog->author,
                'description' => $catalog->description,
                'page_count' => $catalog->page_count,
                'published_date' => $catalog->published_date,
                'genres' => $catalog->genres,
                'series_name' => $catalog->series,
                'series_position' => $catalog->series_position,
                'cover_url_external' => $catalog->cover_url,
                'data_sources' => ['kaggle_catalog'],
                'popularity_score' => $catalog->popularity_score,
                'review_count' => $catalog->review_count,
                'average_rating' => $catalog->average_rating,
                'audience' => $catalog->audience,
                'intensity' => $catalog->intensity,
                'moods' => $catalog->moods,
                'classification_confidence' => $catalog->classification_confidence,
                'is_classified' => $catalog->is_classified,
                'classified_at' => $catalog->classified_at,
                'is_embedded' => $catalog->is_embedded,
            ]);

            // Copy embedding if exists (pgvector requires raw SQL)
            if ($catalog->is_embedded && config('database.default') === 'pgsql') {
                DB::statement('
                    UPDATE master_books
                    SET embedding = (SELECT embedding FROM catalog_books WHERE id = ?)
                    WHERE id = ?
                ', [$catalog->id, $masterBook->id]);
            }

            $masterBook->completeness_score = $masterBook->calculateCompleteness();
            $masterBook->save();

            $this->imported++;
        } catch (\Exception $e) {
            Log::warning('[MigrateCatalog] Failed to import catalog book', [
                'catalog_id' => $catalog->id,
                'error' => $e->getMessage(),
            ]);
            $this->skipped++;
        }
    }

    /**
     * Import books from user library (books table).
     */
    private function importFromLibrary(bool $dryRun): void
    {
        $this->info('Importing from books table...');

        $total = Book::count();
        $this->output->progressStart($total);

        Book::query()
            ->orderByDesc('id')
            ->chunk(500, function ($books) use ($dryRun) {
                foreach ($books as $book) {
                    $this->importLibraryBook($book, $dryRun);
                    $this->output->progressAdvance();
                }
            });

        $this->output->progressFinish();
        $this->info("Library import complete: {$this->imported} imported, {$this->skipped} skipped");
    }

    /**
     * Import a single library book.
     */
    private function importLibraryBook(Book $book, bool $dryRun): void
    {
        // Check for existing by ISBN13
        if ($book->isbn13 && MasterBook::where('isbn13', $book->isbn13)->exists()) {
            $this->skipped++;

            return;
        }

        // Check for existing by Google Books ID
        if ($book->external_id && $book->external_provider === 'google_books') {
            if (MasterBook::where('google_books_id', $book->external_id)->exists()) {
                $this->skipped++;

                return;
            }
        }

        // Check for existing by title+author fuzzy match
        if ($book->title && $book->author) {
            $existing = MasterBook::where('title', 'ILIKE', $book->title)
                ->where('author', 'ILIKE', '%'.explode(',', $book->author)[0].'%')
                ->first();

            if ($existing) {
                $this->skipped++;

                return;
            }
        }

        if ($dryRun) {
            $this->imported++;

            return;
        }

        try {
            $masterBook = MasterBook::create([
                'isbn13' => $book->isbn13,
                'isbn10' => $book->isbn,
                'title' => $book->title,
                'author' => $book->author,
                'description' => $book->description,
                'page_count' => $book->page_count,
                'published_date' => $book->published_date,
                'publisher' => $book->publisher,
                'genres' => $book->genres,
                'cover_url_external' => $book->cover_url,
                'google_books_id' => $book->external_provider === 'google_books' ? $book->external_id : null,
                'data_sources' => [$book->external_provider ?? 'user_library'],
                'audience' => $book->audience,
                'intensity' => $book->intensity,
                'moods' => $book->moods,
                'classification_confidence' => $book->classification_confidence,
                'is_classified' => $book->is_classified,
                'user_count' => 1,
            ]);

            $masterBook->completeness_score = $masterBook->calculateCompleteness();
            $masterBook->save();

            $this->imported++;
        } catch (\Exception $e) {
            Log::warning('[MigrateCatalog] Failed to import library book', [
                'book_id' => $book->id,
                'error' => $e->getMessage(),
            ]);
            $this->skipped++;
        }
    }

    /**
     * Link user_books to master_books.
     */
    private function linkUserBooks(bool $dryRun): void
    {
        $this->info('Linking user_books to master_books...');

        // Link by ISBN13
        $isbnLinks = DB::table('user_books')
            ->join('books', 'user_books.book_id', '=', 'books.id')
            ->join('master_books', 'books.isbn13', '=', 'master_books.isbn13')
            ->whereNull('user_books.master_book_id')
            ->whereNotNull('books.isbn13')
            ->select('user_books.id as user_book_id', 'master_books.id as master_book_id')
            ->get();

        $this->info("Found {$isbnLinks->count()} user_books to link by ISBN");

        if (! $dryRun) {
            foreach ($isbnLinks as $link) {
                DB::table('user_books')
                    ->where('id', $link->user_book_id)
                    ->update(['master_book_id' => $link->master_book_id]);
                $this->linked++;
            }
        } else {
            $this->linked += $isbnLinks->count();
        }

        // Link by Google Books ID
        $googleLinks = DB::table('user_books')
            ->join('books', 'user_books.book_id', '=', 'books.id')
            ->join('master_books', 'books.external_id', '=', 'master_books.google_books_id')
            ->whereNull('user_books.master_book_id')
            ->where('books.external_provider', 'google_books')
            ->select('user_books.id as user_book_id', 'master_books.id as master_book_id')
            ->get();

        $this->info("Found {$googleLinks->count()} user_books to link by Google Books ID");

        if (! $dryRun) {
            foreach ($googleLinks as $link) {
                DB::table('user_books')
                    ->where('id', $link->user_book_id)
                    ->update(['master_book_id' => $link->master_book_id]);
                $this->linked++;
            }
        } else {
            $this->linked += $googleLinks->count();
        }

        // Update user_count on master_books
        if (! $dryRun) {
            $this->info('Updating user counts on master_books...');

            DB::statement('
                UPDATE master_books
                SET user_count = (
                    SELECT COUNT(*)
                    FROM user_books
                    WHERE user_books.master_book_id = master_books.id
                )
            ');
        }

        $this->info("Linked {$this->linked} user_books to master_books");
    }
}
