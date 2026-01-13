<?php

declare(strict_types=1);

namespace App\Enums;

enum GoalTypeEnum: string
{
    case Books = 'books';
    case Pages = 'pages';
    case Minutes = 'minutes';
    case Streak = 'streak';

    public function label(): string
    {
        return match ($this) {
            self::Books => __('Books'),
            self::Pages => __('Pages'),
            self::Minutes => __('Minutes'),
            self::Streak => __('Day Streak'),
        };
    }

    public function unit(): string
    {
        return match ($this) {
            self::Books => __('books'),
            self::Pages => __('pages'),
            self::Minutes => __('minutes'),
            self::Streak => __('days'),
        };
    }

    public static function options(): array
    {
        return collect(self::cases())->map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ])->all();
    }
}
