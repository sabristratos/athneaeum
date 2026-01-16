<?php

declare(strict_types=1);

namespace App\Services\SeedData;

use App\Services\BookSearch\OpenLibraryBookService;
use Illuminate\Support\Facades\Log;

/**
 * Book enrichment service for seed data generation.
 *
 * Uses Open Library exclusively for clean, community-curated data.
 */
class BookEnrichmentService
{
    public function __construct(
        private readonly OpenLibraryBookService $openLibrary
    ) {}

    /**
     * Enrich a book with data from Open Library.
     *
     * @param  string|null  $isbn  ISBN (10 or 13)
     * @param  string  $title  Book title
     * @param  string|null  $author  Author name
     * @return array<string, mixed>|null
     */
    public function enrich(?string $isbn, string $title, ?string $author): ?array
    {
        $data = $this->openLibrary->lookupForEnrichment($isbn, $title, $author);

        if ($data) {
            Log::debug('[BookEnrichment] Open Library data found', [
                'title' => $title,
                'has_cover' => ! empty($data['cover_url']),
                'has_description' => ! empty($data['description']),
            ]);
        }

        return $data;
    }
}
