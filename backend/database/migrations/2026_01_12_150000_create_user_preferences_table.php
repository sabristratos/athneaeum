<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category');
            $table->string('type');
            $table->string('value');
            $table->string('normalized');
            $table->timestamps();

            $table->unique(['user_id', 'category', 'type', 'normalized'], 'user_preferences_unique');
            $table->index(['user_id', 'category', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};
