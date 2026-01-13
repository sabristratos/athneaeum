<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Book;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Book>
 */
class BookFactory extends Factory
{
    protected $model = Book::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'author' => fake()->name(),
            'description' => fake()->paragraphs(2, true),
            'page_count' => fake()->numberBetween(150, 600),
            'isbn' => fake()->isbn13(),
            'published_date' => fake()->date(),
            'genres' => fake()->randomElements([
                'Fiction',
                'Science Fiction',
                'Fantasy',
                'Mystery',
                'Romance',
                'Thriller',
                'Non-fiction',
                'Biography',
                'History',
                'Self-help',
            ], fake()->numberBetween(1, 3)),
            'cover_url' => fake()->optional(0.7)->imageUrl(200, 300, 'books'),
            'external_id' => fake()->optional(0.8)->uuid(),
            'external_provider' => 'google_books',
        ];
    }

    public function withGenres(array $genres): static
    {
        return $this->state(fn (array $attributes) => [
            'genres' => $genres,
        ]);
    }

    public function fiction(): static
    {
        return $this->state(fn (array $attributes) => [
            'genres' => ['Fiction', 'Literary Fiction'],
        ]);
    }

    public function sciFi(): static
    {
        return $this->state(fn (array $attributes) => [
            'genres' => ['Science Fiction', 'Fiction / Science Fiction / Space Opera'],
        ]);
    }

    public function fantasy(): static
    {
        return $this->state(fn (array $attributes) => [
            'genres' => ['Fantasy', 'Fiction / Fantasy / Epic'],
        ]);
    }

    public function mystery(): static
    {
        return $this->state(fn (array $attributes) => [
            'genres' => ['Mystery', 'Fiction / Mystery & Detective'],
        ]);
    }

    public function nonfiction(): static
    {
        return $this->state(fn (array $attributes) => [
            'genres' => ['Non-fiction', 'Biography & Autobiography'],
        ]);
    }

    public function long(): static
    {
        return $this->state(fn (array $attributes) => [
            'page_count' => fake()->numberBetween(500, 1000),
        ]);
    }

    public function short(): static
    {
        return $this->state(fn (array $attributes) => [
            'page_count' => fake()->numberBetween(100, 200),
        ]);
    }
}
