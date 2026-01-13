<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\GenreEnum;
use App\Models\Genre;
use Illuminate\Database\Seeder;

/**
 * Seeds the canonical genres from GenreEnum.
 */
class GenreSeeder extends Seeder
{
    public function run(): void
    {
        $sortOrders = [
            'fiction' => 0,
            'nonfiction' => 100,
            'special' => 200,
        ];

        $categoryIndex = [
            'fiction' => 0,
            'nonfiction' => 0,
            'special' => 0,
        ];

        foreach (GenreEnum::cases() as $genre) {
            $category = $genre->category();
            $baseOrder = $sortOrders[$category];
            $index = $categoryIndex[$category]++;

            Genre::firstOrCreate(
                ['canonical_value' => $genre->value],
                [
                    'name' => $genre->label(),
                    'slug' => $genre->value,
                    'sort_order' => $baseOrder + $index,
                ]
            );
        }
    }
}
