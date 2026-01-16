<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Models\DeletionLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeletionLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_log_deletion_creates_record(): void
    {
        $user = User::factory()->create();

        DeletionLog::logDeletion($user->id, 'user_books', 123);

        $this->assertDatabaseHas('deletion_logs', [
            'user_id' => $user->id,
            'table_name' => 'user_books',
            'record_id' => 123,
        ]);
    }

    public function test_get_deleted_ids_returns_ids_after_timestamp(): void
    {
        $user = User::factory()->create();
        $timestamp = now();

        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'tags',
            'record_id' => 1,
            'deleted_at' => $timestamp->copy()->addMinutes(5),
        ]);

        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'tags',
            'record_id' => 2,
            'deleted_at' => $timestamp->copy()->addMinutes(10),
        ]);

        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'tags',
            'record_id' => 3,
            'deleted_at' => $timestamp->copy()->subMinutes(5),
        ]);

        $deletedIds = DeletionLog::getDeletedIds($user->id, 'tags', $timestamp);

        $this->assertCount(2, $deletedIds);
        $this->assertContains(1, $deletedIds);
        $this->assertContains(2, $deletedIds);
        $this->assertNotContains(3, $deletedIds);
    }

    public function test_get_deleted_ids_filters_by_table_name(): void
    {
        $user = User::factory()->create();

        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'user_books',
            'record_id' => 100,
            'deleted_at' => now(),
        ]);

        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'tags',
            'record_id' => 200,
            'deleted_at' => now(),
        ]);

        $userBookIds = DeletionLog::getDeletedIds($user->id, 'user_books', now()->subMinute());
        $tagIds = DeletionLog::getDeletedIds($user->id, 'tags', now()->subMinute());

        $this->assertEquals([100], $userBookIds);
        $this->assertEquals([200], $tagIds);
    }

    public function test_get_deleted_ids_returns_all_without_timestamp(): void
    {
        $user = User::factory()->create();

        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'reading_sessions',
            'record_id' => 50,
            'deleted_at' => now()->subYear(),
        ]);

        DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'reading_sessions',
            'record_id' => 51,
            'deleted_at' => now(),
        ]);

        $deletedIds = DeletionLog::getDeletedIds($user->id, 'reading_sessions');

        $this->assertCount(2, $deletedIds);
        $this->assertContains(50, $deletedIds);
        $this->assertContains(51, $deletedIds);
    }

    public function test_get_deleted_ids_isolates_by_user(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        DeletionLog::create([
            'user_id' => $user1->id,
            'table_name' => 'user_books',
            'record_id' => 10,
            'deleted_at' => now(),
        ]);

        DeletionLog::create([
            'user_id' => $user2->id,
            'table_name' => 'user_books',
            'record_id' => 20,
            'deleted_at' => now(),
        ]);

        $user1Ids = DeletionLog::getDeletedIds($user1->id, 'user_books', now()->subMinute());
        $user2Ids = DeletionLog::getDeletedIds($user2->id, 'user_books', now()->subMinute());

        $this->assertEquals([10], $user1Ids);
        $this->assertEquals([20], $user2Ids);
    }

    public function test_deletion_log_belongs_to_user(): void
    {
        $user = User::factory()->create();

        $log = DeletionLog::create([
            'user_id' => $user->id,
            'table_name' => 'tags',
            'record_id' => 1,
            'deleted_at' => now(),
        ]);

        $this->assertInstanceOf(User::class, $log->user);
        $this->assertEquals($user->id, $log->user->id);
    }
}
