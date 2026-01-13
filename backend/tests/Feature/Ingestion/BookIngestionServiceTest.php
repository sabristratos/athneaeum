<?php

declare(strict_types=1);

namespace Tests\Feature\Ingestion;

use App\DTOs\Ingestion\RawBookDTO;
use App\Models\Author;
use App\Models\Book;
use App\Models\Genre;
use App\Models\Publisher;
use App\Services\Ingestion\BookIngestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookIngestionServiceTest extends TestCase
{
    use RefreshDatabase;

    private BookIngestionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(BookIngestionService::class);

        $this->seedGenres();
    }

    private function seedGenres(): void
    {
        Genre::create(['name' => 'Fantasy', 'slug' => 'fantasy', 'canonical_value' => 'fantasy']);
        Genre::create(['name' => 'Science Fiction', 'slug' => 'science-fiction', 'canonical_value' => 'science_fiction']);
        Genre::create(['name' => 'Mystery', 'slug' => 'mystery', 'canonical_value' => 'mystery']);
    }

    public function test_creates_new_book(): void
    {
        $raw = new RawBookDTO(
            title: 'The Way of Kings',
            author: 'Brandon Sanderson',
            description: 'An epic fantasy novel.',
            genres: ['Fantasy'],
            isbn: '0765326353',
            pageCount: 1007,
            publishedDate: '2010-08-31',
            externalId: 'google_123',
            externalProvider: 'google_books',
        );

        $book = $this->service->ingest($raw);

        $this->assertInstanceOf(Book::class, $book);
        $this->assertEquals('The Way of Kings', $book->title);
        $this->assertEquals('Brandon Sanderson', $book->author);
        $this->assertEquals(1007, $book->page_count);
        $this->assertEquals('google_123', $book->external_id);
    }

    public function test_creates_author_record(): void
    {
        $raw = new RawBookDTO(
            title: 'The Way of Kings',
            author: 'Brandon Sanderson',
        );

        $book = $this->service->ingest($raw);

        $this->assertCount(1, $book->authors);
        $this->assertEquals('Brandon Sanderson', $book->authors->first()->name);

        $author = Author::where('name', 'Brandon Sanderson')->first();
        $this->assertNotNull($author);
        $this->assertNotEmpty($author->slug);
    }

    public function test_reuses_existing_author(): void
    {
        $existingAuthor = Author::create([
            'name' => 'Brandon Sanderson',
            'slug' => 'brandon-sanderson',
            'sort_name' => 'Sanderson, Brandon',
        ]);

        $raw = new RawBookDTO(
            title: 'The Way of Kings',
            author: 'Brandon Sanderson',
        );

        $book = $this->service->ingest($raw);

        $this->assertCount(1, Author::all());
        $this->assertEquals($existingAuthor->id, $book->authors->first()->id);
    }

    public function test_handles_multiple_authors(): void
    {
        $raw = new RawBookDTO(
            title: 'Good Omens',
            author: 'Neil Gaiman and Terry Pratchett',
        );

        $book = $this->service->ingest($raw);

        $this->assertCount(2, $book->authors);
        $authorNames = $book->authors->pluck('name')->toArray();
        $this->assertContains('Neil Gaiman', $authorNames);
        $this->assertContains('Terry Pratchett', $authorNames);
    }

    public function test_assigns_genres(): void
    {
        $raw = new RawBookDTO(
            title: 'The Way of Kings',
            author: 'Brandon Sanderson',
            genres: ['Fantasy'],
        );

        $book = $this->service->ingest($raw);

        $this->assertCount(1, $book->genreRelations);
        $this->assertEquals('fantasy', $book->genreRelations->first()->canonical_value);
    }

    public function test_creates_publisher(): void
    {
        $raw = new RawBookDTO(
            title: 'The Way of Kings',
            author: 'Brandon Sanderson',
            publisher: 'Tor Books',
        );

        $book = $this->service->ingest($raw);

        $this->assertNotNull($book->publisher);
        $this->assertEquals('Tor', $book->publisher->name);

        $publisher = Publisher::where('slug', 'tor')->first();
        $this->assertNotNull($publisher);
    }

    public function test_creates_series(): void
    {
        $raw = new RawBookDTO(
            title: 'The Way of Kings (Stormlight Archive, #1)',
            author: 'Brandon Sanderson',
        );

        $book = $this->service->ingest($raw);

        $this->assertNotNull($book->series);
        $this->assertEquals('Stormlight Archive', $book->series->title);
        $this->assertEquals(1, $book->volume_number);
    }

    public function test_finds_existing_book_by_external_id(): void
    {
        $existing = Book::create([
            'title' => 'Existing Book',
            'author' => 'Test Author',
            'external_id' => 'google_123',
            'external_provider' => 'google_books',
        ]);

        $raw = new RawBookDTO(
            title: 'Updated Title',
            author: 'Updated Author',
            externalId: 'google_123',
            externalProvider: 'google_books',
        );

        $book = $this->service->ingest($raw);

        $this->assertEquals($existing->id, $book->id);
        $this->assertEquals('Existing Book', $book->title);
    }

    public function test_finds_existing_book_by_isbn13(): void
    {
        $existing = Book::create([
            'title' => 'Existing Book',
            'author' => 'Test Author',
            'isbn13' => '9780306406157',
        ]);

        $raw = new RawBookDTO(
            title: 'Same Book Different Source',
            author: 'Test Author',
            isbn13: '9780306406157',
        );

        $book = $this->service->ingest($raw);

        $this->assertEquals($existing->id, $book->id);
    }

    public function test_updates_book_with_missing_data(): void
    {
        $existing = Book::create([
            'title' => 'Existing Book',
            'author' => 'Test Author',
            'external_id' => 'google_123',
            'external_provider' => 'google_books',
            'description' => null,
            'page_count' => null,
        ]);

        $raw = new RawBookDTO(
            title: 'Existing Book',
            author: 'Test Author',
            description: 'A new description',
            pageCount: 300,
            externalId: 'google_123',
            externalProvider: 'google_books',
        );

        $book = $this->service->ingest($raw);

        $this->assertEquals($existing->id, $book->id);
        $this->assertEquals('A new description', $book->description);
        $this->assertEquals(300, $book->page_count);
    }

    public function test_does_not_overwrite_existing_data(): void
    {
        $existing = Book::create([
            'title' => 'Existing Book',
            'author' => 'Test Author',
            'description' => 'Original description',
            'external_id' => 'google_123',
            'external_provider' => 'google_books',
        ]);

        $raw = new RawBookDTO(
            title: 'Existing Book',
            author: 'Test Author',
            description: 'New description',
            externalId: 'google_123',
            externalProvider: 'google_books',
        );

        $book = $this->service->ingest($raw);

        $this->assertEquals('Original description', $book->description);
    }

    public function test_respects_locked_books(): void
    {
        $existing = Book::create([
            'title' => 'Locked Book',
            'author' => 'Test Author',
            'description' => null,
            'external_id' => 'google_123',
            'external_provider' => 'google_books',
            'is_locked' => true,
        ]);

        $raw = new RawBookDTO(
            title: 'Locked Book',
            author: 'Test Author',
            description: 'New description',
            externalId: 'google_123',
            externalProvider: 'google_books',
        );

        $book = $this->service->ingest($raw);

        $this->assertEquals($existing->id, $book->id);
        $this->assertNull($book->description);
    }

    public function test_ingest_batch_processes_multiple_books(): void
    {
        $rawBooks = [
            new RawBookDTO(title: 'Book One', author: 'Author One'),
            new RawBookDTO(title: 'Book Two', author: 'Author Two'),
            new RawBookDTO(title: 'Book Three', author: 'Author Three'),
        ];

        $result = $this->service->ingestBatch($rawBooks);

        $this->assertCount(3, $result['books']);
        $this->assertEmpty($result['errors']);
        $this->assertEquals(3, Book::count());
    }

    public function test_ingest_batch_handles_all_books(): void
    {
        $rawBooks = [
            new RawBookDTO(title: 'Book One', author: 'Author One'),
            new RawBookDTO(title: null, author: null),
            new RawBookDTO(title: 'Book Three', author: 'Author Three'),
        ];

        $result = $this->service->ingestBatch($rawBooks);

        $this->assertCount(3, $result['books']);
        $this->assertEmpty($result['errors']);
        $this->assertEquals('Untitled', $result['books'][1]->title);
    }

    public function test_update_from_external_updates_book(): void
    {
        $book = Book::create([
            'title' => 'Test Book',
            'author' => 'Test Author',
            'description' => null,
        ]);

        $raw = new RawBookDTO(
            title: 'Test Book',
            author: 'Test Author',
            description: 'New description from external',
            pageCount: 250,
        );

        $updated = $this->service->updateFromExternal($book, $raw);

        $this->assertEquals('New description from external', $updated->description);
        $this->assertEquals(250, $updated->page_count);
    }
}
