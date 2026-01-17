<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the master_books table - unified book registry for discovery and user library.
     */
    public function up(): void
    {
        Schema::create('master_books', function (Blueprint $table) {
            $table->id();

            // Deduplication keys
            $table->string('isbn13', 17)->nullable()->unique();
            $table->string('isbn10', 13)->nullable()->index();

            // Core metadata
            $table->string('title', 500);
            $table->string('subtitle', 500)->nullable();
            $table->string('author', 500)->nullable();
            $table->text('description')->nullable();
            $table->integer('page_count')->nullable();
            $table->date('published_date')->nullable();
            $table->string('publisher', 255)->nullable();
            $table->string('language', 10)->default('en');

            // Structured metadata
            $table->jsonb('genres')->nullable();
            $table->jsonb('subjects')->nullable();
            $table->string('series_name', 500)->nullable()->index();
            $table->integer('series_position')->nullable();

            // Cover management
            $table->string('cover_path')->nullable();
            $table->string('cover_url_external', 1000)->nullable();
            $table->timestamp('cover_fetched_at')->nullable();

            // External references
            $table->string('google_books_id')->nullable()->index();
            $table->string('open_library_key')->nullable()->index();
            $table->string('goodreads_id')->nullable()->index();

            // Data quality tracking
            $table->jsonb('data_sources')->default('[]');
            $table->float('completeness_score')->default(0);
            $table->timestamp('last_enriched_at')->nullable();
            $table->integer('user_count')->default(0)->index();

            // Classification (LLM)
            $table->string('audience', 20)->nullable()->index();
            $table->string('intensity', 20)->nullable()->index();
            $table->jsonb('moods')->nullable();
            $table->float('classification_confidence')->nullable();
            $table->boolean('is_classified')->default(false)->index();
            $table->timestamp('classified_at')->nullable();

            // Vibe classification vectors (1.0-10.0 scale)
            $table->decimal('mood_darkness', 3, 1)->nullable();
            $table->decimal('pacing_speed', 3, 1)->nullable();
            $table->decimal('complexity_score', 3, 1)->nullable();
            $table->decimal('emotional_intensity', 3, 1)->nullable();

            // Vibe categorical classifications
            $table->string('plot_archetype', 30)->nullable();
            $table->string('prose_style', 30)->nullable();
            $table->string('setting_atmosphere', 30)->nullable();

            // Vibe tracking
            $table->decimal('vibe_confidence', 3, 2)->default(0);
            $table->boolean('is_vibe_classified')->default(false)->index();

            // NYT Bestseller tracking
            $table->boolean('is_nyt_bestseller')->default(false)->index();
            $table->string('nyt_list_category', 100)->nullable();
            $table->integer('nyt_weeks_on_list')->nullable();
            $table->integer('nyt_peak_rank')->nullable();
            $table->date('nyt_first_seen_date')->nullable();

            // Discovery metrics
            $table->float('popularity_score')->default(0)->index();
            $table->integer('review_count')->default(0);
            $table->decimal('average_rating', 3, 2)->nullable();
            $table->boolean('is_embedded')->default(false)->index();

            $table->timestamps();

            // Composite index for fuzzy matching fallback
            $table->index(['title', 'author']);
        });

        // Add pgvector embedding column (PostgreSQL only)
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE master_books ADD COLUMN embedding vector(768)');

            DB::statement('
                CREATE INDEX master_books_embedding_idx
                ON master_books
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64)
            ');
        }

        // Create pivot table for master_book <-> author relationships
        Schema::create('master_book_authors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('master_book_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('position')->default(1);
            $table->timestamps();

            $table->unique(['master_book_id', 'author_id']);
            $table->index('author_id');
        });

        // Create pivot table for master_book <-> genre relationships
        Schema::create('master_book_genres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('master_book_id')->constrained()->cascadeOnDelete();
            $table->foreignId('genre_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['master_book_id', 'genre_id']);
            $table->index('genre_id');
        });

        // Add master_book_id to user_books for linking
        Schema::table('user_books', function (Blueprint $table) {
            $table->foreignId('master_book_id')
                ->nullable()
                ->after('book_id')
                ->constrained('master_books')
                ->nullOnDelete();
        });
    }

    /**
     * Drop the master_books table and related columns.
     */
    public function down(): void
    {
        Schema::table('user_books', function (Blueprint $table) {
            $table->dropConstrainedForeignId('master_book_id');
        });

        Schema::dropIfExists('master_book_genres');
        Schema::dropIfExists('master_book_authors');
        Schema::dropIfExists('master_books');
    }
};
