<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_statistics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Lifetime Totals
            $table->integer('total_books_read')->default(0);
            $table->integer('total_pages_read')->default(0);
            $table->integer('total_reading_seconds')->default(0);
            $table->integer('total_books_dnf')->default(0);
            $table->integer('total_sessions')->default(0);
            $table->decimal('total_spent', 10, 2)->default(0);

            // Current Period (resets monthly/yearly)
            $table->integer('books_read_this_year')->default(0);
            $table->integer('books_read_this_month')->default(0);
            $table->integer('pages_read_this_year')->default(0);
            $table->integer('pages_read_this_month')->default(0);
            $table->integer('reading_seconds_this_year')->default(0);
            $table->integer('reading_seconds_this_month')->default(0);

            // Streaks
            $table->integer('current_streak')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->date('last_reading_date')->nullable();
            $table->date('streak_start_date')->nullable();

            // Velocity & Averages
            $table->decimal('avg_pages_per_hour', 6, 2)->nullable();
            $table->decimal('avg_pages_per_session', 6, 2)->nullable();
            $table->integer('avg_session_minutes')->nullable();
            $table->decimal('avg_rating', 3, 2)->nullable();
            $table->decimal('avg_book_length', 8, 2)->nullable();

            // Patterns (JSON for flexibility)
            $table->json('reading_by_hour')->nullable();
            $table->json('reading_by_day_of_week')->nullable();
            $table->json('reading_by_month')->nullable();
            $table->json('genres_breakdown')->nullable();
            $table->json('formats_breakdown')->nullable();
            $table->json('authors_breakdown')->nullable();
            $table->json('ratings_distribution')->nullable();
            $table->json('completion_by_length')->nullable();

            // Computed Scores
            $table->integer('consistency_score')->nullable();
            $table->integer('diversity_score')->nullable();
            $table->string('reader_type')->nullable();
            $table->string('reading_pace')->nullable();

            // LLM-Ready Profile
            $table->json('reading_profile')->nullable();
            $table->text('profile_narrative')->nullable();

            // Metadata
            $table->timestamp('last_calculated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_statistics');
    }
};
