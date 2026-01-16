<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\DeletionLog;
use App\Models\ReadingSession;
use App\Models\ReadThrough;
use App\Models\Tag;
use App\Models\User;
use App\Models\UserBook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_push_creates_and_links_related_entities()
    {
        $user = User::factory()->create();

        // Prepare payload with local IDs
        // 1. Create a Book
        // 2. Create UserBook linking to Book
        // 3. Create ReadThrough linking to UserBook
        // 4. Create ReadingSession linking to ReadThrough and UserBook

        $payload = [
            'books' => [
                'created' => [
                    [
                        'local_id' => 'local_book_1',
                        'external_id' => 'ext_123',
                        'title' => 'Test Book',
                        'author' => 'Test Author',
                    ],
                ],
                'updated' => [],
                'deleted' => [],
            ],
            'user_books' => [
                'created' => [
                    [
                        'local_id' => 'local_ub_1',
                        'book_local_id' => 'local_book_1',
                        'status' => 'reading',
                        'current_page' => 50,
                        'is_dnf' => false,
                        'is_pinned' => false,
                    ],
                ],
                'updated' => [],
                'deleted' => [],
            ],
            'read_throughs' => [
                'created' => [
                    [
                        'local_id' => 'local_rt_1',
                        'user_book_local_id' => 'local_ub_1',
                        'read_number' => 1,
                        'status' => 'reading',
                        'is_dnf' => false,
                    ],
                ],
                'updated' => [],
                'deleted' => [],
            ],
            'reading_sessions' => [
                'created' => [
                    [
                        'local_id' => 'local_session_1',
                        'user_book_local_id' => 'local_ub_1',
                        'read_through_local_id' => 'local_rt_1',
                        'date' => '2023-01-01',
                        'pages_read' => 10,
                        'start_page' => 0,
                        'end_page' => 10,
                        'duration_seconds' => 300,
                    ],
                ],
                'updated' => [],
                'deleted' => [],
            ],
            // Include empty arrays for other entities to avoid validation errors if strict
            'tags' => ['created' => [], 'updated' => [], 'deleted' => []],
            'user_preferences' => ['created' => [], 'updated' => [], 'deleted' => []],
            'reading_goals' => ['created' => [], 'updated' => [], 'deleted' => []],
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/sync/push', $payload);

        $response->assertStatus(200);

        // Verify Structure
        $response->assertJsonStructure([
            'status',
            'id_mappings' => [
                'books',
                'user_books',
                'read_throughs',
                'reading_sessions',
            ],
            'counts',
        ]);

        $responseData = $response->json();

        // 1. Verify Book
        $this->assertDatabaseHas('books', ['external_id' => 'ext_123']);
        $bookId = Book::where('external_id', 'ext_123')->first()->id;

        // 2. Verify UserBook
        $this->assertDatabaseHas('user_books', [
            'user_id' => $user->id,
            'book_id' => $bookId,
            'status' => 'reading',
        ]);
        $userBookId = UserBook::where('user_id', $user->id)->first()->id;

        // 3. Verify ReadThrough
        $this->assertDatabaseHas('read_throughs', [
            'user_book_id' => $userBookId,
            'read_number' => 1,
        ]);
        $readThroughId = ReadThrough::where('user_book_id', $userBookId)->first()->id;

        // 4. Verify Session
        $this->assertDatabaseHas('reading_sessions', [
            'user_book_id' => $userBookId,
            'read_through_id' => $readThroughId,
            'pages_read' => 10,
        ]);
        $sessionId = ReadingSession::where('read_through_id', $readThroughId)->first()->id;

        // 5. Verify Mappings contain the correct Server IDs
        // Specifically check that server_read_through_id is present in reading_sessions mapping
        $sessionMapping = collect($responseData['id_mappings']['reading_sessions'])
            ->firstWhere('local_id', 'local_session_1');

        $this->assertNotNull($sessionMapping, 'Session mapping not found');
        $this->assertEquals($sessionId, $sessionMapping['server_id']);
        $this->assertEquals($userBookId, $sessionMapping['server_user_book_id']);

        // CRITICAL CHECK: Verify server_read_through_id is returned
        $this->assertArrayHasKey('server_read_through_id', $sessionMapping, 'Missing server_read_through_id in mapping');
        $this->assertEquals($readThroughId, $sessionMapping['server_read_through_id']);
    }

    public function test_sync_pull_returns_changes()
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();
        $userBook = UserBook::factory()->create([
            'user_id' => $user->id,
            'book_id' => $book->id,
        ]);

        // Create a change (new session)
        $session = ReadingSession::factory()->create([
            'user_book_id' => $userBook->id,
            'date' => now(),
            'pages_read' => 20,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/sync/pull?last_pulled_at=0');

        $response->assertStatus(200);

        $data = $response->json();

        // Verify session is in created list
        $this->assertNotEmpty($data['changes']['reading_sessions']['created']);
        $syncedSession = collect($data['changes']['reading_sessions']['created'])
            ->firstWhere('id', $session->id);

        $this->assertNotNull($syncedSession);
        $this->assertEquals(20, $syncedSession['pages_read']);
    }

    public function test_sync_push_logs_user_book_deletion()
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();
        $userBook = UserBook::factory()->create([
            'user_id' => $user->id,
            'book_id' => $book->id,
        ]);

        $payload = [
            'books' => ['created' => [], 'updated' => [], 'deleted' => []],
            'user_books' => [
                'created' => [],
                'updated' => [],
                'deleted' => [$userBook->id],
            ],
            'read_throughs' => ['created' => [], 'updated' => [], 'deleted' => []],
            'reading_sessions' => ['created' => [], 'updated' => [], 'deleted' => []],
            'tags' => ['created' => [], 'updated' => [], 'deleted' => []],
            'user_preferences' => ['created' => [], 'updated' => [], 'deleted' => []],
            'reading_goals' => ['created' => [], 'updated' => [], 'deleted' => []],
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/sync/push', $payload);

        $response->assertStatus(200);

        $this->assertDatabaseMissing('user_books', ['id' => $userBook->id]);

        $this->assertDatabaseHas('deletion_logs', [
            'user_id' => $user->id,
            'table_name' => 'user_books',
            'record_id' => $userBook->id,
        ]);
    }

    public function test_sync_push_logs_tag_deletion()
    {
        $user = User::factory()->create();
        $tag = Tag::create([
            'user_id' => $user->id,
            'name' => 'Test Tag',
            'slug' => 'test-tag',
            'color' => 'primary',
            'is_system' => false,
            'sort_order' => 0,
        ]);

        $payload = [
            'books' => ['created' => [], 'updated' => [], 'deleted' => []],
            'user_books' => ['created' => [], 'updated' => [], 'deleted' => []],
            'read_throughs' => ['created' => [], 'updated' => [], 'deleted' => []],
            'reading_sessions' => ['created' => [], 'updated' => [], 'deleted' => []],
            'tags' => [
                'created' => [],
                'updated' => [],
                'deleted' => [$tag->id],
            ],
            'user_preferences' => ['created' => [], 'updated' => [], 'deleted' => []],
            'reading_goals' => ['created' => [], 'updated' => [], 'deleted' => []],
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/sync/push', $payload);

        $response->assertStatus(200);

        $this->assertDatabaseMissing('tags', ['id' => $tag->id]);

        $this->assertDatabaseHas('deletion_logs', [
            'user_id' => $user->id,
            'table_name' => 'tags',
            'record_id' => $tag->id,
        ]);
    }

    public function test_sync_pull_returns_deleted_user_books()
    {
        $user = User::factory()->create();

        $deletedAt = now();
        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'user_books',
            'record_id' => 999,
            'deleted_at' => $deletedAt,
        ]);

        $lastPulledAt = $deletedAt->subSeconds(10)->getTimestampMs();

        $response = $this->actingAs($user)
            ->getJson("/api/sync/pull?last_pulled_at={$lastPulledAt}");

        $response->assertStatus(200);

        $data = $response->json();

        $this->assertContains(999, $data['changes']['user_books']['deleted']);
    }

    public function test_sync_pull_returns_deleted_tags()
    {
        $user = User::factory()->create();

        $deletedAt = now();
        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'tags',
            'record_id' => 888,
            'deleted_at' => $deletedAt,
        ]);

        $lastPulledAt = $deletedAt->subSeconds(10)->getTimestampMs();

        $response = $this->actingAs($user)
            ->getJson("/api/sync/pull?last_pulled_at={$lastPulledAt}");

        $response->assertStatus(200);

        $data = $response->json();

        $this->assertContains(888, $data['changes']['tags']['deleted']);
    }

    public function test_sync_pull_does_not_return_deletions_before_timestamp()
    {
        $user = User::factory()->create();

        $deletedAt = now()->subHours(2);
        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'user_books',
            'record_id' => 777,
            'deleted_at' => $deletedAt,
        ]);

        $lastPulledAt = now()->subHour()->getTimestampMs();

        $response = $this->actingAs($user)
            ->getJson("/api/sync/pull?last_pulled_at={$lastPulledAt}");

        $response->assertStatus(200);

        $data = $response->json();

        $this->assertNotContains(777, $data['changes']['user_books']['deleted']);
    }

    public function test_sync_pull_first_sync_returns_empty_deleted_arrays()
    {
        $user = User::factory()->create();

        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'user_books',
            'record_id' => 666,
            'deleted_at' => now(),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/sync/pull?last_pulled_at=0');

        $response->assertStatus(200);

        $data = $response->json();

        $this->assertEmpty($data['changes']['user_books']['deleted']);
        $this->assertEmpty($data['changes']['tags']['deleted']);
        $this->assertEmpty($data['changes']['reading_sessions']['deleted']);
    }

    public function test_sync_push_logs_reading_session_deletion()
    {
        $user = User::factory()->create();
        $book = Book::factory()->create();
        $userBook = UserBook::factory()->create([
            'user_id' => $user->id,
            'book_id' => $book->id,
        ]);
        $session = ReadingSession::factory()->create([
            'user_book_id' => $userBook->id,
        ]);

        $payload = [
            'books' => ['created' => [], 'updated' => [], 'deleted' => []],
            'user_books' => ['created' => [], 'updated' => [], 'deleted' => []],
            'read_throughs' => ['created' => [], 'updated' => [], 'deleted' => []],
            'reading_sessions' => [
                'created' => [],
                'updated' => [],
                'deleted' => [$session->id],
            ],
            'tags' => ['created' => [], 'updated' => [], 'deleted' => []],
            'user_preferences' => ['created' => [], 'updated' => [], 'deleted' => []],
            'reading_goals' => ['created' => [], 'updated' => [], 'deleted' => []],
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/sync/push', $payload);

        $response->assertStatus(200);

        $this->assertDatabaseMissing('reading_sessions', ['id' => $session->id]);

        $this->assertDatabaseHas('deletion_logs', [
            'user_id' => $user->id,
            'table_name' => 'reading_sessions',
            'record_id' => $session->id,
        ]);
    }

    public function test_deletion_log_isolates_users()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        DeletionLog::create([
            'user_id' => $user1->id,
            'table_name' => 'user_books',
            'record_id' => 111,
            'deleted_at' => now(),
        ]);

        DeletionLog::create([
            'user_id' => $user2->id,
            'table_name' => 'user_books',
            'record_id' => 222,
            'deleted_at' => now(),
        ]);

        $lastPulledAt = now()->subMinute()->getTimestampMs();

        $response1 = $this->actingAs($user1)
            ->getJson("/api/sync/pull?last_pulled_at={$lastPulledAt}");

        $data1 = $response1->json();
        $this->assertContains(111, $data1['changes']['user_books']['deleted']);
        $this->assertNotContains(222, $data1['changes']['user_books']['deleted']);

        $response2 = $this->actingAs($user2)
            ->getJson("/api/sync/pull?last_pulled_at={$lastPulledAt}");

        $data2 = $response2->json();
        $this->assertContains(222, $data2['changes']['user_books']['deleted']);
        $this->assertNotContains(111, $data2['changes']['user_books']['deleted']);
    }
}
