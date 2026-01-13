<?php

declare(strict_types=1);

namespace App\Services\Ingestion\Resolvers;

use App\Contracts\PublisherResolverInterface;
use App\Models\Publisher;
use Illuminate\Support\Str;

/**
 * Resolves publisher strings to Publisher models.
 */
class PublisherResolver implements PublisherResolverInterface
{
    /**
     * Common publisher name variations to normalize.
     */
    private const NORMALIZATIONS = [
        'penguin random house' => 'Penguin Random House',
        'prh' => 'Penguin Random House',
        'harpercollins' => 'HarperCollins',
        'harper collins' => 'HarperCollins',
        'simon & schuster' => 'Simon & Schuster',
        'simon and schuster' => 'Simon & Schuster',
        'macmillan' => 'Macmillan',
        'hachette' => 'Hachette',
        'scholastic' => 'Scholastic',
    ];

    /**
     * Suffixes to strip from publisher names.
     */
    private const STRIP_SUFFIXES = [
        ', Inc.',
        ', Inc',
        ' Inc.',
        ' Inc',
        ', LLC',
        ' LLC',
        ', Ltd.',
        ' Ltd.',
        ', Ltd',
        ' Ltd',
        ' Publishing',
        ' Publishers',
        ' Books',
        ' Press',
    ];

    /**
     * {@inheritdoc}
     */
    public function findOrCreate(string $name): Publisher
    {
        $normalized = $this->normalizeName($name);
        $slug = Str::slug($normalized);

        $existing = $this->findBySlug($slug);
        if ($existing) {
            return $existing;
        }

        $similar = $this->findSimilar($normalized);
        if (! empty($similar)) {
            return $similar[0];
        }

        return Publisher::create([
            'name' => $normalized,
            'slug' => $slug,
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function findBySlug(string $slug): ?Publisher
    {
        return Publisher::where('slug', $slug)->first();
    }

    /**
     * {@inheritdoc}
     */
    public function findSimilar(string $name, float $threshold = 0.85): array
    {
        $normalizedInput = strtolower($this->normalizeName($name));
        $allPublishers = Publisher::all();
        $matches = [];

        foreach ($allPublishers as $publisher) {
            similar_text(
                $normalizedInput,
                strtolower($publisher->name),
                $percent
            );

            if ($percent / 100 >= $threshold) {
                $matches[] = [
                    'publisher' => $publisher,
                    'similarity' => $percent / 100,
                ];
            }
        }

        usort($matches, fn ($a, $b) => $b['similarity'] <=> $a['similarity']);

        return array_map(fn ($m) => $m['publisher'], $matches);
    }

    /**
     * Normalize a publisher name.
     */
    private function normalizeName(string $name): string
    {
        $name = trim($name);
        $name = html_entity_decode($name, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        foreach (self::STRIP_SUFFIXES as $suffix) {
            if (str_ends_with($name, $suffix)) {
                $name = substr($name, 0, -strlen($suffix));
            }
        }

        $lowered = strtolower($name);
        if (isset(self::NORMALIZATIONS[$lowered])) {
            return self::NORMALIZATIONS[$lowered];
        }

        return ucwords(strtolower($name));
    }
}
