<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Cleaners;

use App\DTOs\Ingestion\AuthorDTO;
use App\Services\Authors\AuthorNormalizer;

/**
 * Handles author name sanitization and parsing.
 *
 * Extends the functionality of AuthorNormalizer with additional
 * cleaning logic for the ingestion pipeline.
 */
class AuthorCleaner
{
    /**
     * Pattern to detect "Last, First" format.
     */
    private const NAME_FLIP_PATTERN = '/^([^,]+),\s*(.+)$/';

    /**
     * Multi-author separators to split on.
     */
    private const MULTI_AUTHOR_SEPARATORS = [';', ' and ', ' & ', ' with '];

    /**
     * Role patterns to extract from author names.
     */
    private const ROLE_PATTERNS = [
        '/\s*\(editor\)\s*$/i' => 'editor',
        '/\s*\(illustrator\)\s*$/i' => 'illustrator',
        '/\s*\(translator\)\s*$/i' => 'translator',
        '/\s*\(narrator\)\s*$/i' => 'narrator',
        '/\s*\(foreword\)\s*$/i' => 'foreword',
        '/\s*\(introduction\)\s*$/i' => 'introduction',
    ];

    /**
     * Names to skip or treat as unknown.
     */
    private const BLOCKLIST = [
        'unknown',
        'various',
        'various authors',
        'anonymous',
        'n/a',
        'na',
        '',
    ];

    public function __construct(
        private readonly AuthorNormalizer $normalizer
    ) {}

    /**
     * Clean and parse an author string into AuthorDTOs.
     *
     * @return array<AuthorDTO>
     */
    public function clean(?string $authorString): array
    {
        if (empty($authorString)) {
            return [AuthorDTO::unknown()];
        }

        $authorString = trim($authorString);
        $authorString = html_entity_decode($authorString, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        if (in_array(strtolower($authorString), self::BLOCKLIST, true)) {
            return [AuthorDTO::unknown()];
        }

        $rawAuthors = $this->splitAuthors($authorString);
        $authors = [];

        foreach ($rawAuthors as $position => $raw) {
            $dto = $this->cleanSingleAuthor($raw);
            if ($dto !== null) {
                $authors[] = $dto;
            }
        }

        return ! empty($authors) ? $authors : [AuthorDTO::unknown()];
    }

    /**
     * Clean a single author name.
     */
    private function cleanSingleAuthor(string $name): ?AuthorDTO
    {
        $name = trim($name);

        if (empty($name) || in_array(strtolower($name), self::BLOCKLIST, true)) {
            return null;
        }

        $role = $this->extractRole($name);
        $name = $this->stripRole($name);
        $name = $this->flipIfNeeded($name);
        $normalized = $this->normalizer->normalize($name);
        $slug = $this->normalizer->slugify($normalized);
        $sortName = $this->generateSortName($normalized);

        return new AuthorDTO(
            name: $normalized,
            slug: $slug,
            sortName: $sortName,
            role: $role,
        );
    }

    /**
     * Split a string containing multiple authors.
     *
     * @return array<string>
     */
    private function splitAuthors(string $authorString): array
    {
        foreach (self::MULTI_AUTHOR_SEPARATORS as $separator) {
            if (stripos($authorString, $separator) !== false) {
                $parts = preg_split('/'.preg_quote($separator, '/').'/i', $authorString);

                return array_filter(array_map('trim', $parts));
            }
        }

        if (substr_count($authorString, ',') > 1) {
            return array_filter(array_map('trim', explode(',', $authorString)));
        }

        if (substr_count($authorString, ',') === 1 && ! $this->isLastFirstFormat($authorString)) {
            return array_filter(array_map('trim', explode(',', $authorString)));
        }

        return [$authorString];
    }

    /**
     * Check if a name is in "Last, First" format.
     */
    private function isLastFirstFormat(string $name): bool
    {
        if (! preg_match(self::NAME_FLIP_PATTERN, $name, $matches)) {
            return false;
        }

        $lastName = trim($matches[1]);
        $firstName = trim($matches[2]);

        if (strlen($firstName) <= 4 && preg_match('/^[A-Z]\.?(\s*[A-Z]\.?)*$/i', $firstName)) {
            return true;
        }

        if (! str_contains($firstName, ' ') && strlen($firstName) < strlen($lastName)) {
            return true;
        }

        return false;
    }

    /**
     * Flip "Last, First" to "First Last".
     */
    private function flipIfNeeded(string $name): string
    {
        if (! preg_match(self::NAME_FLIP_PATTERN, $name, $matches)) {
            return $name;
        }

        if (! $this->isLastFirstFormat($name)) {
            return $name;
        }

        return trim($matches[2]).' '.trim($matches[1]);
    }

    /**
     * Extract role from author name if present.
     */
    private function extractRole(string $name): string
    {
        foreach (self::ROLE_PATTERNS as $pattern => $role) {
            if (preg_match($pattern, $name)) {
                return $role;
            }
        }

        return 'author';
    }

    /**
     * Strip role suffix from author name.
     */
    private function stripRole(string $name): string
    {
        foreach (self::ROLE_PATTERNS as $pattern => $role) {
            $name = preg_replace($pattern, '', $name);
        }

        return trim($name);
    }

    /**
     * Generate sort name from display name.
     * "J.K. Rowling" -> "Rowling, J.K."
     */
    private function generateSortName(string $name): string
    {
        $parts = explode(' ', $name);

        if (count($parts) <= 1) {
            return $name;
        }

        $lastName = array_pop($parts);

        $particles = ['von', 'van', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'du', 'des'];
        if (count($parts) > 0 && in_array(strtolower(end($parts)), $particles, true)) {
            $particle = array_pop($parts);
            $lastName = $particle.' '.$lastName;
        }

        return $lastName.', '.implode(' ', $parts);
    }
}
