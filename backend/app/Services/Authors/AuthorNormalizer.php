<?php

declare(strict_types=1);

namespace App\Services\Authors;

use Illuminate\Support\Str;

/**
 * Handles author name normalization and alias resolution.
 *
 * Provides consistent name formatting and maps known pen names
 * to canonical author names.
 */
class AuthorNormalizer
{
    /**
     * Known pen name aliases mapped to canonical names.
     */
    private const KNOWN_ALIASES = [
        'j.k. rowling' => 'J.K. Rowling',
        'jk rowling' => 'J.K. Rowling',
        'joanne rowling' => 'J.K. Rowling',
        'robert galbraith' => 'J.K. Rowling',
        'richard bachman' => 'Stephen King',
        'mark twain' => 'Mark Twain',
        'samuel clemens' => 'Mark Twain',
        'samuel langhorne clemens' => 'Mark Twain',
        'george orwell' => 'George Orwell',
        'eric arthur blair' => 'George Orwell',
        'lewis carroll' => 'Lewis Carroll',
        'charles lutwidge dodgson' => 'Lewis Carroll',
        'dr. seuss' => 'Dr. Seuss',
        'dr seuss' => 'Dr. Seuss',
        'theodor seuss geisel' => 'Dr. Seuss',
        'agatha christie' => 'Agatha Christie',
        'mary westmacott' => 'Agatha Christie',
        'anne rice' => 'Anne Rice',
        'anne rampling' => 'Anne Rice',
        'a.n. roquelaure' => 'Anne Rice',
        'dean koontz' => 'Dean Koontz',
        'leigh nichols' => 'Dean Koontz',
        'nora roberts' => 'Nora Roberts',
        'j.d. robb' => 'Nora Roberts',
        'isaac asimov' => 'Isaac Asimov',
        'paul french' => 'Isaac Asimov',
        'c.s. lewis' => 'C.S. Lewis',
        'cs lewis' => 'C.S. Lewis',
        'clive staples lewis' => 'C.S. Lewis',
        'j.r.r. tolkien' => 'J.R.R. Tolkien',
        'jrr tolkien' => 'J.R.R. Tolkien',
        'john ronald reuel tolkien' => 'J.R.R. Tolkien',
    ];

    /**
     * Normalize an author name for consistent storage and comparison.
     */
    public function normalize(string $name): string
    {
        $name = trim($name);
        $lowered = strtolower($name);

        if (isset(self::KNOWN_ALIASES[$lowered])) {
            return self::KNOWN_ALIASES[$lowered];
        }

        return $this->titleCase($name);
    }

    /**
     * Create a slug-style normalized version for matching.
     */
    public function slugify(string $name): string
    {
        $normalized = $this->normalize($name);

        return Str::slug($normalized);
    }

    /**
     * Find the canonical name for an author, checking OpenLibrary if needed.
     */
    public function findCanonicalName(string $name): string
    {
        $lowered = strtolower(trim($name));

        if (isset(self::KNOWN_ALIASES[$lowered])) {
            return self::KNOWN_ALIASES[$lowered];
        }

        return $this->normalize($name);
    }

    /**
     * Check if two author names likely refer to the same person.
     */
    public function isSameAuthor(string $name1, string $name2): bool
    {
        $slug1 = $this->slugify($name1);
        $slug2 = $this->slugify($name2);

        if ($slug1 === $slug2) {
            return true;
        }

        $canonical1 = $this->findCanonicalName($name1);
        $canonical2 = $this->findCanonicalName($name2);

        return strtolower($canonical1) === strtolower($canonical2);
    }

    /**
     * Parse a comma-separated author string into individual names.
     */
    public function parseAuthors(string $authorString): array
    {
        if (empty($authorString)) {
            return [];
        }

        $authors = explode(',', $authorString);

        return array_values(array_filter(array_map(
            fn ($name) => $this->normalize(trim($name)),
            $authors
        )));
    }

    /**
     * Group authors by canonical name to handle aliases.
     *
     * @param  array<string>  $authorNames
     * @return array<string, array{canonical: string, variants: array<string>}>
     */
    public function groupByCanonical(array $authorNames): array
    {
        $groups = [];

        foreach ($authorNames as $name) {
            $canonical = $this->findCanonicalName($name);
            $slug = $this->slugify($canonical);

            if (! isset($groups[$slug])) {
                $groups[$slug] = [
                    'canonical' => $canonical,
                    'variants' => [],
                ];
            }

            $trimmedName = trim($name);
            if (! in_array($trimmedName, $groups[$slug]['variants'], true)) {
                $groups[$slug]['variants'][] = $trimmedName;
            }
        }

        return $groups;
    }

    /**
     * Convert name to title case, handling special cases.
     */
    private function titleCase(string $name): string
    {
        $name = mb_convert_case($name, MB_CASE_TITLE, 'UTF-8');

        $name = preg_replace_callback(
            '/\b(Mc|Mac|O\')(\w)/u',
            fn ($matches) => $matches[1].mb_strtoupper($matches[2]),
            $name
        );

        $name = preg_replace_callback(
            '/\b([IVXLCDM]+)\b/i',
            fn ($matches) => strtoupper($matches[1]),
            $name
        );

        $name = preg_replace_callback(
            '/([A-Z])\.([A-Z])\./u',
            fn ($matches) => strtoupper($matches[1]).'.'.strtoupper($matches[2]).'.',
            $name
        );

        $particles = ['von', 'van', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'du', 'des'];
        foreach ($particles as $particle) {
            $name = preg_replace(
                '/\b'.ucfirst($particle).'\b/',
                $particle,
                $name
            );
        }

        return $name;
    }
}
