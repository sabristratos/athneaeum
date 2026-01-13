<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reading_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('period');
            $table->integer('target');
            $table->integer('year');
            $table->integer('month')->nullable();
            $table->integer('week')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'year', 'is_active']);
            $table->index(['user_id', 'type', 'period', 'year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_goals');
    }
};
