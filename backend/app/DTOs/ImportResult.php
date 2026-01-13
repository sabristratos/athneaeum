<?php

declare(strict_types=1);

namespace App\DTOs;

class ImportResult
{
    public int $imported = 0;

    public int $skipped = 0;

    public int $errors = 0;

    /** @var array<string> */
    public array $errorMessages = [];

    public function addImported(): void
    {
        $this->imported++;
    }

    public function addSkipped(): void
    {
        $this->skipped++;
    }

    public function addError(string $message): void
    {
        $this->errors++;
        $this->errorMessages[] = $message;
    }

    public function toArray(): array
    {
        return [
            'imported' => $this->imported,
            'skipped' => $this->skipped,
            'errors' => $this->errors,
            'error_messages' => array_slice($this->errorMessages, 0, 10),
        ];
    }
}
