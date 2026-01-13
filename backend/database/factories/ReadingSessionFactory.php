<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ReadingSession;
use App\Models\UserBook;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReadingSession>
 */
class ReadingSessionFactory extends Factory
{
    protected $model = ReadingSession::class;

    public function definition(): array
    {
        $pagesRead = fake()->numberBetween(10, 80);
        $startPage = fake()->numberBetween(1, 200);

        return [
            'user_book_id' => UserBook::factory(),
            'date' => fake()->dateTimeBetween('-6 months', 'now'),
            'pages_read' => $pagesRead,
            'start_page' => $startPage,
            'end_page' => $startPage + $pagesRead,
            'duration_seconds' => fake()->numberBetween(900, 7200),
            'notes' => fake()->optional(0.2)->sentence(),
        ];
    }

    public function forUserBook(UserBook $userBook): static
    {
        return $this->state(fn (array $attributes) => [
            'user_book_id' => $userBook->id,
        ]);
    }

    public function forReadThrough(\App\Models\ReadThrough $readThrough): static
    {
        return $this->state(fn (array $attributes) => [
            'user_book_id' => $readThrough->user_book_id,
            'read_through_id' => $readThrough->id,
        ]);
    }

    public function onDate(\DateTimeInterface|string $date): static
    {
        return $this->state(fn (array $attributes) => [
            'date' => $date,
        ]);
    }

    public function withPages(int $pages): static
    {
        return $this->state(function (array $attributes) use ($pages) {
            $startPage = $attributes['start_page'] ?? 1;

            return [
                'pages_read' => $pages,
                'end_page' => $startPage + $pages,
            ];
        });
    }

    public function withDuration(int $seconds): static
    {
        return $this->state(fn (array $attributes) => [
            'duration_seconds' => $seconds,
        ]);
    }

    public function today(): static
    {
        return $this->state(fn (array $attributes) => [
            'date' => now(),
        ]);
    }

    public function yesterday(): static
    {
        return $this->state(fn (array $attributes) => [
            'date' => now()->subDay(),
        ]);
    }

    public function daysAgo(int $days): static
    {
        return $this->state(fn (array $attributes) => [
            'date' => now()->subDays($days),
        ]);
    }

    public function inSeason(string $season): static
    {
        $monthRanges = [
            'winter' => [12, 1, 2],
            'spring' => [3, 4, 5],
            'summer' => [6, 7, 8],
            'fall' => [9, 10, 11],
        ];

        $months = $monthRanges[$season] ?? [1];
        $month = fake()->randomElement($months);

        return $this->state(fn (array $attributes) => [
            'date' => now()->setMonth($month)->subYear(fake()->boolean() ? 0 : 1),
        ]);
    }
}
