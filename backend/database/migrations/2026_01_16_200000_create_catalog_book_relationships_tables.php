<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_book_authors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_book_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('position')->default(1);
            $table->timestamps();

            $table->unique(['catalog_book_id', 'author_id']);
            $table->index('author_id');
        });

        Schema::create('catalog_book_genres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_book_id')->constrained()->cascadeOnDelete();
            $table->foreignId('genre_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['catalog_book_id', 'genre_id']);
            $table->index('genre_id');
        });

        Schema::create('unmapped_genres', function (Blueprint $table) {
            $table->id();
            $table->string('raw_genre')->unique();
            $table->unsignedInteger('occurrence_count')->default(1);
            $table->string('suggested_mapping')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unmapped_genres');
        Schema::dropIfExists('catalog_book_genres');
        Schema::dropIfExists('catalog_book_authors');
    }
};
