<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_statistics_monthly', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('year');
            $table->integer('month');

            // Activity Counts
            $table->integer('books_started')->default(0);
            $table->integer('books_read')->default(0);
            $table->integer('books_dnf')->default(0);
            $table->integer('pages_read')->default(0);
            $table->integer('reading_seconds')->default(0);
            $table->integer('sessions_count')->default(0);

            // Averages for the Month
            $table->decimal('avg_rating', 3, 2)->nullable();
            $table->decimal('avg_pages_per_session', 6, 2)->nullable();
            $table->decimal('avg_pages_per_hour', 6, 2)->nullable();

            // Streaks
            $table->integer('longest_streak_in_month')->default(0);
            $table->integer('active_days')->default(0);

            // Breakdowns (JSON)
            $table->json('genres')->nullable();
            $table->json('formats')->nullable();
            $table->json('top_books')->nullable();
            $table->json('reading_by_day')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'year', 'month']);
            $table->index(['user_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_statistics_monthly');
    }
};
