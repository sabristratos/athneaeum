<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the user_embeddings table for caching computed user preference vectors.
     */
    public function up(): void
    {
        Schema::create('user_embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->jsonb('computed_from')->nullable();
            $table->timestamp('computed_at')->nullable();
            $table->timestamps();
        });

        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE user_embeddings ADD COLUMN embedding vector(768)');
        }
    }

    /**
     * Drop the user_embeddings table.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_embeddings');
    }
};
