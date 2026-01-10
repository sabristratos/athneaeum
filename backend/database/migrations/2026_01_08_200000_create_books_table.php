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
            $table->string('isbn')->nullable();
            $table->text('description')->nullable();
            $table->json('genres')->nullable();
            $table->date('published_date')->nullable();
            $table->timestamps();

            $table->unique(['external_id', 'external_provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
