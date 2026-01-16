<?php

declare(strict_types=1);

namespace App\DTOs\SeedData;

/**
 * Result of book filtering through the kill list.
 *
 * Captures whether a book passed or was filtered out,
 * along with the reason and matched keyword for debugging.
 */
final readonly class BookFilterResultDTO
{
    public function __construct(
        public bool $passed,
        public ?string $reason = null,
        public ?string $matchedKeyword = null,
        public ?string $matchedIn = null,
    ) {}

    public static function pass(): self
    {
        return new self(passed: true);
    }

    public static function reject(string $reason, ?string $matchedKeyword = null, ?string $matchedIn = null): self
    {
        return new self(
            passed: false,
            reason: $reason,
            matchedKeyword: $matchedKeyword,
            matchedIn: $matchedIn,
        );
    }

    public function getDebugMessage(): string
    {
        if ($this->passed) {
            return 'Passed filter';
        }

        $message = "Filtered: {$this->reason}";

        if ($this->matchedKeyword) {
            $message .= " (keyword: '{$this->matchedKeyword}'";
            if ($this->matchedIn) {
                $message .= " in {$this->matchedIn}";
            }
            $message .= ')';
        }

        return $message;
    }
}
