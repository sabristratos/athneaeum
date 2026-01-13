<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('series', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('author');
            $table->string('external_id')->nullable();
            $table->string('external_provider')->nullable();
            $table->unsignedInteger('total_volumes')->nullable();
            $table->boolean('is_complete')->default(false);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['title', 'author']);
            $table->index('external_id');
        });

        Schema::table('books', function (Blueprint $table) {
            $table->foreignId('series_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->unsignedInteger('volume_number')->nullable()->after('series_id');
            $table->string('volume_title')->nullable()->after('volume_number');
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropForeign(['series_id']);
            $table->dropColumn(['series_id', 'volume_number', 'volume_title']);
        });

        Schema::dropIfExists('series');
    }
};
