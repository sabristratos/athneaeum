<?php

declare(strict_types=1);

namespace App\Http\Resources\Concerns;

/**
 * Provides UTF-8 sanitization for JSON resources.
 *
 * Ensures all string values can be safely JSON encoded without
 * "Malformed UTF-8 characters" errors.
 */
trait SanitizesUtf8
{
    /**
     * Sanitize a string to ensure valid UTF-8 encoding.
     */
    protected function sanitizeUtf8(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        $sanitized = mb_convert_encoding($value, 'UTF-8', 'UTF-8');

        if ($sanitized === false) {
            $sanitized = iconv('UTF-8', 'UTF-8//IGNORE', $value);
        }

        return $sanitized ?: null;
    }
}
