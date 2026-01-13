<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('publishers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->foreignId('parent_publisher_id')->nullable()->constrained('publishers')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('parent_publisher_id');
        });

        Schema::table('books', function (Blueprint $table) {
            $table->foreignId('publisher_id')->nullable()->after('published_date')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropForeign(['publisher_id']);
            $table->dropColumn('publisher_id');
        });

        Schema::dropIfExists('publishers');
    }
};
