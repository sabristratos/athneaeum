<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the user_signals table for tracking user interactions with catalog books.
     */
    public function up(): void
    {
        Schema::create('user_signals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_book_id')->constrained()->cascadeOnDelete();
            $table->string('signal_type', 20);
            $table->decimal('weight', 3, 2)->default(1.0);
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index('catalog_book_id');
            $table->index('created_at');
        });
    }

    /**
     * Drop the user_signals table.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_signals');
    }
};
