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
        Schema::create('user_books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->string('status');
            $table->decimal('rating', 3, 2)->nullable();
            $table->integer('current_page')->default(0);
            $table->boolean('is_dnf')->default(false);
            $table->text('dnf_reason')->nullable();
            $table->text('review')->nullable();
            $table->date('started_at')->nullable();
            $table->date('finished_at')->nullable();
            $table->string('custom_cover_url')->nullable();
            $table->string('format')->nullable();
            $table->decimal('price', 8, 2)->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->unsignedInteger('queue_position')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'book_id']);
            $table->index('status');
            $table->index(['user_id', 'status']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE user_books ADD CONSTRAINT user_books_rating_check CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_books');
    }
};
