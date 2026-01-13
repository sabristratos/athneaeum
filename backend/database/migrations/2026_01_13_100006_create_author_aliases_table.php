<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('author_aliases', function (Blueprint $table) {
            $table->id();
            $table->string('alias');
            $table->string('normalized_alias');
            $table->foreignId('author_id')->constrained()->cascadeOnDelete();
            $table->string('alias_type')->default('variant');
            $table->string('source')->default('manual');
            $table->boolean('verified')->default(false);
            $table->timestamps();

            $table->unique('normalized_alias');
            $table->index('author_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('author_aliases');
    }
};
