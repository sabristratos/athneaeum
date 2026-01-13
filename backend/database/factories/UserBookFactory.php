<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BookFormatEnum;
use App\Enums\BookStatusEnum;
use App\Models\Book;
use App\Models\User;
use App\Models\UserBook;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserBook>
 */
class UserBookFactory extends Factory
{
    protected $model = UserBook::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'book_id' => Book::factory(),
            'status' => BookStatusEnum::Reading,
            'format' => fake()->randomElement(BookFormatEnum::cases()),
            'current_page' => 0,
            'rating' => null,
            'review' => null,
            'is_dnf' => false,
            'dnf_reason' => null,
            'is_pinned' => false,
            'price' => fake()->optional(0.3)->randomFloat(2, 5, 30),
            'started_at' => fake()->dateTimeBetween('-1 year', 'now'),
            'finished_at' => null,
        ];
    }

    public function forUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
        ]);
    }

    public function forBook(Book $book): static
    {
        return $this->state(fn (array $attributes) => [
            'book_id' => $book->id,
        ]);
    }

    public function reading(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookStatusEnum::Reading,
            'started_at' => fake()->dateTimeBetween('-3 months', 'now'),
            'finished_at' => null,
            'current_page' => fake()->numberBetween(10, 200),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookStatusEnum::Read,
            'started_at' => fake()->dateTimeBetween('-1 year', '-1 month'),
            'finished_at' => fake()->dateTimeBetween('-1 month', 'now'),
            'rating' => fake()->optional(0.8)->randomFloat(1, 3, 5),
        ]);
    }

    public function dnf(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookStatusEnum::Dnf,
            'is_dnf' => true,
            'dnf_reason' => fake()->randomElement(['not_for_me', 'boring', 'writing', 'content', 'other']),
            'started_at' => fake()->dateTimeBetween('-6 months', '-1 month'),
            'current_page' => fake()->numberBetween(20, 150),
        ]);
    }

    public function wishlist(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookStatusEnum::Wishlist,
            'started_at' => null,
            'finished_at' => null,
            'current_page' => 0,
        ]);
    }

    public function tbr(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookStatusEnum::ToRead,
            'started_at' => null,
            'finished_at' => null,
            'current_page' => 0,
        ]);
    }

    public function rated(float $rating): static
    {
        return $this->state(fn (array $attributes) => [
            'rating' => $rating,
        ]);
    }

    public function withFormat(BookFormatEnum $format): static
    {
        return $this->state(fn (array $attributes) => [
            'format' => $format,
        ]);
    }
}
