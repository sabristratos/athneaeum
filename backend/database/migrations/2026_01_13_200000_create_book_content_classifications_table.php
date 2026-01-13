<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cache table for LLM content classifications.
 *
 * Stores description assessments, content classifications, and series extractions
 * to avoid repeated LLM calls for the same book.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_content_classifications', function (Blueprint $table) {
            $table->id();

            $table->string('content_hash', 64)->unique();
            $table->string('external_id')->nullable()->index();
            $table->string('external_provider')->nullable();

            $table->string('description_quality')->nullable();
            $table->boolean('description_is_usable')->default(true);
            $table->boolean('description_is_promotional')->default(false);
            $table->boolean('description_is_truncated')->default(false);
            $table->boolean('description_has_spoilers')->default(false);
            $table->decimal('description_confidence', 3, 2)->default(0);

            $table->string('audience')->nullable();
            $table->string('intensity')->nullable();
            $table->json('moods')->nullable();
            $table->decimal('content_confidence', 3, 2)->default(0);

            $table->boolean('series_mentioned')->default(false);
            $table->string('series_name')->nullable();
            $table->string('series_position_hint')->nullable();
            $table->unsignedSmallInteger('series_volume_hint')->nullable();
            $table->decimal('series_confidence', 3, 2)->default(0);

            $table->timestamps();

            $table->index(['external_id', 'external_provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_content_classifications');
    }
};
