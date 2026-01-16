<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the catalog_books table for discovery recommendations.
     */
    public function up(): void
    {
        Schema::create('catalog_books', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique()->nullable();
            $table->string('external_provider', 50)->default('kaggle');
            $table->string('title', 500);
            $table->string('author', 500)->nullable();
            $table->text('description')->nullable();
            $table->jsonb('genres')->nullable();
            $table->integer('page_count')->nullable();
            $table->date('published_date')->nullable();
            $table->string('isbn', 13)->nullable()->index();
            $table->string('isbn13', 17)->nullable()->index();
            $table->string('cover_url', 1000)->nullable();
            $table->jsonb('characters')->nullable();

            $table->string('series', 500)->nullable()->index();
            $table->integer('series_position')->nullable();

            $table->string('format', 20)->nullable()->index();

            $table->float('popularity_score')->default(0)->index();
            $table->integer('review_count')->default(0);
            $table->decimal('average_rating', 3, 2)->nullable();

            $table->boolean('is_embedded')->default(false)->index();

            $table->string('audience', 20)->nullable()->index();
            $table->string('intensity', 20)->nullable()->index();
            $table->jsonb('moods')->nullable();
            $table->float('classification_confidence')->nullable();
            $table->boolean('is_classified')->default(false)->index();
            $table->timestamp('classified_at')->nullable();

            $table->timestamps();
        });

        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE catalog_books ADD COLUMN embedding vector(768)');

            DB::statement('
                CREATE INDEX catalog_books_embedding_idx
                ON catalog_books
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64)
            ');
        }
    }

    /**
     * Drop the catalog_books table.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_books');
    }
};
