<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_book_tag', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_book_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_book_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_book_tag');
    }
};
