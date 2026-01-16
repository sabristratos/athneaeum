<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deletion_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('table_name');
            $table->unsignedBigInteger('record_id');
            $table->timestamp('deleted_at');
            $table->index(['user_id', 'deleted_at']);
            $table->index(['user_id', 'table_name', 'deleted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deletion_logs');
    }
};
