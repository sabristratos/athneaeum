<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->nullable();
            $table->string('external_provider')->nullable();
            $table->string('title');
            $table->string('author');
            $table->string('cover_url')->nullable();
            $table->integer('page_count')->nullable();
            $table->decimal('height_cm', 5, 2)->nullable();
            $table->decimal('width_cm', 5, 2)->nullable();
            $table->decimal('thickness_cm', 5, 2)->nullable();
            $table->string('isbn')->nullable();
            $table->string('isbn13')->nullable();
            $table->text('description')->nullable();
            $table->json('genres')->nullable();
            $table->date('published_date')->nullable();
            $table->boolean('is_locked')->default(false);

            $table->string('audience')->nullable();
            $table->string('intensity')->nullable();
            $table->json('moods')->nullable();
            $table->decimal('classification_confidence', 3, 2)->nullable();
            $table->boolean('is_classified')->default(false);

            $table->timestamps();

            $table->unique(['external_id', 'external_provider']);
            $table->index('isbn13');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
