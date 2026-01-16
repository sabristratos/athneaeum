<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Utility class for ISBN validation and cleaning.
 */
final class IsbnUtility
{
    /**
     * Clean an ISBN by removing all non-ISBN characters.
     */
    public static function clean(?string $isbn): ?string
    {
        if ($isbn === null || trim($isbn) === '') {
            return null;
        }

        $cleaned = preg_replace('/[^\dXx]/', '', trim($isbn));

        return $cleaned !== '' ? $cleaned : null;
    }

    /**
     * Check if a string looks like a valid ISBN.
     */
    public static function isValid(string $value): bool
    {
        $cleaned = preg_replace('/[\s\-]/', '', trim($value));

        return self::isIsbn13($cleaned) || self::isIsbn10($cleaned);
    }

    /**
     * Check if value is a valid ISBN-13 (13 digits, starting with 978 or 979).
     */
    public static function isIsbn13(string $value): bool
    {
        return (bool) preg_match('/^(978|979)\d{10}$/', $value);
    }

    /**
     * Check if value is a valid ISBN-10 (10 characters, may end with X).
     */
    public static function isIsbn10(string $value): bool
    {
        return (bool) preg_match('/^\d{9}[\dXx]$/', $value);
    }

    /**
     * Get the primary ISBN from ISBN-13 and ISBN-10 candidates (prefers ISBN-13).
     */
    public static function getPrimary(?string $isbn13, ?string $isbn10): ?string
    {
        $clean13 = self::clean($isbn13);
        $clean10 = self::clean($isbn10);

        if ($clean13 !== null && self::isIsbn13($clean13)) {
            return $clean13;
        }

        if ($clean10 !== null && self::isIsbn10($clean10)) {
            return $clean10;
        }

        return $clean13 ?? $clean10;
    }
}
