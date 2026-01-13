<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('genre_mappings', function (Blueprint $table) {
            $table->id();
            $table->string('external_genre');
            $table->string('normalized_external');
            $table->foreignId('genre_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source');
            $table->decimal('confidence', 3, 2)->default(1.00);
            $table->boolean('verified')->default(false);
            $table->timestamps();

            $table->unique(['normalized_external', 'source']);
            $table->index('genre_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('genre_mappings');
    }
};
