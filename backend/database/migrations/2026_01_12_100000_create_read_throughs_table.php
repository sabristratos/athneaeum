<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('read_throughs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_book_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('read_number')->default(1);
            $table->date('started_at')->nullable();
            $table->date('finished_at')->nullable();
            $table->decimal('rating', 3, 2)->nullable();
            $table->text('review')->nullable();
            $table->string('status')->default('reading');
            $table->boolean('is_dnf')->default(false);
            $table->text('dnf_reason')->nullable();
            $table->timestamps();

            $table->unique(['user_book_id', 'read_number']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE read_throughs ADD CONSTRAINT read_throughs_rating_check CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))');
        }

        Schema::table('reading_sessions', function (Blueprint $table) {
            $table->foreignId('read_through_id')
                ->nullable()
                ->after('user_book_id')
                ->constrained()
                ->nullOnDelete();
        });

        $this->migrateExistingData();
    }

    public function down(): void
    {
        Schema::table('reading_sessions', function (Blueprint $table) {
            $table->dropForeign(['read_through_id']);
            $table->dropColumn('read_through_id');
        });

        Schema::dropIfExists('read_throughs');
    }

    private function migrateExistingData(): void
    {
        $userBooks = DB::table('user_books')
            ->whereNotNull('started_at')
            ->orWhereNotNull('finished_at')
            ->orWhereNotNull('rating')
            ->orWhere('status', 'read')
            ->orWhere('status', 'reading')
            ->get();

        foreach ($userBooks as $userBook) {
            $readThroughId = DB::table('read_throughs')->insertGetId([
                'user_book_id' => $userBook->id,
                'read_number' => 1,
                'started_at' => $userBook->started_at,
                'finished_at' => $userBook->finished_at,
                'rating' => $userBook->rating,
                'review' => $userBook->review,
                'status' => $userBook->status,
                'is_dnf' => $userBook->is_dnf ?? false,
                'dnf_reason' => $userBook->dnf_reason,
                'created_at' => $userBook->created_at,
                'updated_at' => $userBook->updated_at,
            ]);

            DB::table('reading_sessions')
                ->where('user_book_id', $userBook->id)
                ->update(['read_through_id' => $readThroughId]);
        }
    }
};
