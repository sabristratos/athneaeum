<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Cleaners;

/**
 * Handles ISBN validation and normalization.
 */
class IsbnCleaner
{
    /**
     * Clean and validate ISBNs.
     *
     * @return array{isbn10: ?string, isbn13: ?string, valid: bool}
     */
    public function clean(?string $isbn, ?string $isbn13 = null): array
    {
        $cleanedIsbn = $this->normalize($isbn);
        $cleanedIsbn13 = $this->normalize($isbn13);

        if ($cleanedIsbn13 === null && $cleanedIsbn !== null && strlen($cleanedIsbn) === 13) {
            $cleanedIsbn13 = $cleanedIsbn;
            $cleanedIsbn = null;
        }

        if ($cleanedIsbn !== null && strlen($cleanedIsbn) !== 10) {
            $cleanedIsbn = null;
        }

        if ($cleanedIsbn13 !== null && strlen($cleanedIsbn13) !== 13) {
            $cleanedIsbn13 = null;
        }

        $valid10 = $cleanedIsbn !== null && $this->validateIsbn10($cleanedIsbn);
        $valid13 = $cleanedIsbn13 !== null && $this->validateIsbn13($cleanedIsbn13);

        return [
            'isbn10' => $valid10 ? $cleanedIsbn : null,
            'isbn13' => $valid13 ? $cleanedIsbn13 : null,
            'valid' => $valid10 || $valid13,
        ];
    }

    /**
     * Normalize an ISBN by removing formatting.
     */
    private function normalize(?string $isbn): ?string
    {
        if (empty($isbn)) {
            return null;
        }

        $cleaned = preg_replace('/[^\dXx]/', '', $isbn);
        $cleaned = strtoupper($cleaned);

        return strlen($cleaned) > 0 ? $cleaned : null;
    }

    /**
     * Validate an ISBN-10 checksum.
     */
    private function validateIsbn10(string $isbn): bool
    {
        if (strlen($isbn) !== 10) {
            return false;
        }

        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            if (! ctype_digit($isbn[$i])) {
                return false;
            }
            $sum += (int) $isbn[$i] * (10 - $i);
        }

        $check = $isbn[9];
        if ($check === 'X') {
            $sum += 10;
        } elseif (ctype_digit($check)) {
            $sum += (int) $check;
        } else {
            return false;
        }

        return $sum % 11 === 0;
    }

    /**
     * Validate an ISBN-13 checksum.
     */
    private function validateIsbn13(string $isbn): bool
    {
        if (strlen($isbn) !== 13) {
            return false;
        }

        if (! ctype_digit($isbn)) {
            return false;
        }

        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $isbn[$i] * ($i % 2 === 0 ? 1 : 3);
        }

        $check = (10 - ($sum % 10)) % 10;

        return (int) $isbn[12] === $check;
    }

    /**
     * Convert ISBN-10 to ISBN-13.
     */
    public function isbn10To13(string $isbn10): ?string
    {
        if (strlen($isbn10) !== 10) {
            return null;
        }

        $isbn13 = '978'.substr($isbn10, 0, 9);

        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $isbn13[$i] * ($i % 2 === 0 ? 1 : 3);
        }

        $check = (10 - ($sum % 10)) % 10;

        return $isbn13.$check;
    }

    /**
     * Convert ISBN-13 to ISBN-10 (only works for 978 prefix).
     */
    public function isbn13To10(string $isbn13): ?string
    {
        if (strlen($isbn13) !== 13 || ! str_starts_with($isbn13, '978')) {
            return null;
        }

        $isbn10 = substr($isbn13, 3, 9);

        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += (int) $isbn10[$i] * (10 - $i);
        }

        $check = (11 - ($sum % 11)) % 11;
        $checkChar = $check === 10 ? 'X' : (string) $check;

        return $isbn10.$checkChar;
    }
}
