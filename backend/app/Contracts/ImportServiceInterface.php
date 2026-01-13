<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTOs\ImportOptions;
use App\DTOs\ImportResult;
use App\Models\User;

interface ImportServiceInterface
{
    /**
     * Get the provider name for this import service.
     */
    public function getProviderName(): string;

    /**
     * Import books from a file for the given user.
     */
    public function import(User $user, string $filePath, ImportOptions $options): ImportResult;

    /**
     * Get the supported file extensions for this import service.
     *
     * @return array<string>
     */
    public function getSupportedExtensions(): array;
}
