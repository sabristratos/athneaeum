<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\TagColorEnum;
use App\Models\Tag;
use Illuminate\Database\Seeder;

class TagSeeder extends Seeder
{
    /**
     * Seed the system tags.
     */
    public function run(): void
    {
        $systemTags = [
            ['name' => 'Favorites', 'slug' => 'favorites', 'color' => TagColorEnum::Primary, 'sort_order' => 1],
            ['name' => 'Classics', 'slug' => 'classics', 'color' => TagColorEnum::Gold, 'sort_order' => 2],
            ['name' => 'Re-read', 'slug' => 're-read', 'color' => TagColorEnum::Green, 'sort_order' => 3],
            ['name' => 'Book Club', 'slug' => 'book-club', 'color' => TagColorEnum::Purple, 'sort_order' => 4],
            ['name' => 'Signed Copy', 'slug' => 'signed-copy', 'color' => TagColorEnum::Copper, 'sort_order' => 5],
            ['name' => 'Borrowed', 'slug' => 'borrowed', 'color' => TagColorEnum::Blue, 'sort_order' => 6],
            ['name' => 'Audiobook', 'slug' => 'audiobook', 'color' => TagColorEnum::Orange, 'sort_order' => 7],
            ['name' => 'E-book', 'slug' => 'e-book', 'color' => TagColorEnum::Teal, 'sort_order' => 8],
        ];

        foreach ($systemTags as $tag) {
            Tag::firstOrCreate(
                ['slug' => $tag['slug'], 'is_system' => true],
                [
                    'name' => $tag['name'],
                    'color' => $tag['color'],
                    'is_system' => true,
                    'sort_order' => $tag['sort_order'],
                    'user_id' => null,
                ]
            );
        }
    }
}
