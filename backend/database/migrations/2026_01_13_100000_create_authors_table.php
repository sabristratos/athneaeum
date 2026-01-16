<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('authors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sort_name')->nullable();
            $table->json('metadata')->nullable();
            $table->string('photo_url')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('external_id')->nullable();
            $table->string('external_provider')->nullable();
            $table->boolean('is_merged')->default(false);
            $table->foreignId('canonical_author_id')->nullable()->constrained('authors')->nullOnDelete();
            $table->string('source')->default('user');
            $table->string('open_library_key')->nullable();
            $table->timestamps();

            $table->index('external_id');
            $table->index('sort_name');
            $table->index('open_library_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('authors');
    }
};
