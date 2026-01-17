<?php

declare(strict_types=1);

namespace App\Services\Ingestion\LLM;

use App\DTOs\Ingestion\ContentClassificationDTO;
use App\DTOs\Ingestion\DescriptionAssessmentDTO;
use App\DTOs\Ingestion\SeriesExtractionDTO;
use App\DTOs\Ingestion\VibeClassificationDTO;
use App\Enums\AudienceEnum;
use App\Enums\ContentIntensityEnum;
use App\Enums\DescriptionQualityEnum;
use App\Enums\GenreEnum;
use App\Enums\MoodEnum;
use App\Enums\PlotArchetypeEnum;
use App\Enums\ProseStyleEnum;
use App\Enums\SeriesPositionEnum;
use App\Enums\SettingAtmosphereEnum;
use App\Models\Author;
use App\Models\AuthorAlias;
use App\Models\BookContentClassification;
use App\Models\Genre;
use App\Models\GenreMapping;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Level 2 (LLM/Consultant) for resolving ambiguous data.
 *
 * Uses Gemini Flash to make decisions when Level 1 (code) fails.
 * All decisions are cached permanently in the database.
 */
class LLMConsultant
{
    private const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    /**
     * Resolve an unknown genre to a canonical genre.
     *
     * @param  string  $unknownGenre  The genre string that couldn't be mapped
     * @param  string  $source  The data source (google_books, goodreads, etc.)
     */
    public function resolveGenre(string $unknownGenre, string $source): ?Genre
    {
        $cached = GenreMapping::findMapping($unknownGenre, $source);
        if ($cached && $cached->genre_id) {
            return Genre::find($cached->genre_id);
        }

        if (! $this->isEnabled()) {
            Log::info('LLM disabled, skipping genre resolution', ['genre' => $unknownGenre]);

            return null;
        }

        $canonicalGenres = collect(GenreEnum::cases())
            ->map(fn (GenreEnum $g) => $g->label())
            ->join(', ');

        $prompt = $this->buildGenrePrompt($unknownGenre, $canonicalGenres);

        try {
            $response = $this->callGemini($prompt);
            $matchedGenre = $this->parseGenreResponse($response);

            if ($matchedGenre) {
                $genre = Genre::where('canonical_value', $matchedGenre->value)->first();

                if (! $genre) {
                    $genre = Genre::create([
                        'name' => $matchedGenre->label(),
                        'slug' => $matchedGenre->value,
                        'canonical_value' => $matchedGenre->value,
                    ]);
                }

                GenreMapping::learnMapping($unknownGenre, $genre, $source, 0.9, false);

                Log::info('LLM resolved genre', [
                    'input' => $unknownGenre,
                    'output' => $matchedGenre->value,
                ]);

                return $genre;
            }

            GenreMapping::learnMapping($unknownGenre, null, $source, 0.5, false);

            return null;
        } catch (\Exception $e) {
            Log::error('LLM genre resolution failed', [
                'genre' => $unknownGenre,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Enrich genres from book content when only generic genres are available.
     *
     * @param  string  $title  The book title
     * @param  string|null  $description  The book description
     * @param  string|null  $author  The book author
     * @param  string  $source  The data source
     * @return array<Genre> Array of resolved Genre models
     */
    public function enrichGenresFromContent(
        string $title,
        ?string $description,
        ?string $author,
        string $source
    ): array {
        if (! $this->isEnabled()) {
            Log::info('[LLMConsultant] LLM disabled, skipping genre enrichment');

            return [];
        }

        $canonicalGenres = collect(GenreEnum::cases())
            ->map(fn (GenreEnum $g) => $g->label())
            ->join(', ');

        $prompt = $this->buildGenreEnrichmentPrompt($title, $description, $author, $canonicalGenres);

        Log::info('[LLMConsultant] Enriching genres from content', [
            'title' => $title,
            'author' => $author,
            'hasDescription' => ! empty($description),
        ]);

        try {
            $response = $this->callGemini($prompt);
            $matchedGenres = $this->parseGenreEnrichmentResponse($response);

            Log::info('[LLMConsultant] Genre enrichment result', [
                'title' => $title,
                'matchedGenres' => array_map(fn ($g) => $g->value, $matchedGenres),
            ]);

            $genres = [];
            foreach ($matchedGenres as $genreEnum) {
                $genre = Genre::where('canonical_value', $genreEnum->value)->first();

                if (! $genre) {
                    $genre = Genre::create([
                        'name' => $genreEnum->label(),
                        'slug' => $genreEnum->value,
                        'canonical_value' => $genreEnum->value,
                    ]);
                }

                $genres[] = $genre;
            }

            return $genres;
        } catch (\Exception $e) {
            Log::error('[LLMConsultant] Genre enrichment failed', [
                'title' => $title,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Resolve an ambiguous author name.
     *
     * @param  string  $ambiguousName  The author name to resolve
     * @param  array<Author>  $candidates  Potential matching authors
     */
    public function resolveAuthor(string $ambiguousName, array $candidates): ?Author
    {
        $cached = AuthorAlias::findAuthorByAlias($ambiguousName);
        if ($cached) {
            return $cached;
        }

        if (! $this->isEnabled() || empty($candidates)) {
            return null;
        }

        $candidateNames = collect($candidates)
            ->map(fn (Author $a) => $a->name)
            ->join(', ');

        $prompt = $this->buildAuthorPrompt($ambiguousName, $candidateNames);

        try {
            $response = $this->callGemini($prompt);
            $matchedAuthor = $this->parseAuthorResponse($response, $candidates);

            if ($matchedAuthor) {
                AuthorAlias::learnAlias(
                    $ambiguousName,
                    $matchedAuthor,
                    AuthorAlias::TYPE_VARIANT,
                    'llm',
                    false
                );

                Log::info('LLM resolved author', [
                    'input' => $ambiguousName,
                    'output' => $matchedAuthor->name,
                ]);

                return $matchedAuthor;
            }

            return null;
        } catch (\Exception $e) {
            Log::error('LLM author resolution failed', [
                'author' => $ambiguousName,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Assess the quality of a book description.
     *
     * Classifies descriptions for promotional content, truncation,
     * spoilers, and overall quality.
     *
     * @param  string  $title  The book title
     * @param  string  $description  The description to assess
     * @param  string|null  $author  The author name (for cache consistency)
     * @param  string|null  $externalId  External ID for caching
     * @param  string|null  $externalProvider  External provider for caching
     */
    public function assessDescription(
        string $title,
        string $description,
        ?string $author = null,
        ?string $externalId = null,
        ?string $externalProvider = null
    ): DescriptionAssessmentDTO {
        $cached = BookContentClassification::findByContent($title, $description, $author);
        if ($cached && $cached->description_confidence > 0) {
            Log::debug('[LLMConsultant] Using cached description assessment', ['title' => $title]);

            return $cached->getDescriptionAssessment();
        }

        if (! $this->isEnabled()) {
            Log::info('[LLMConsultant] LLM disabled, returning default assessment');

            return $this->defaultDescriptionAssessment();
        }

        $prompt = $this->buildDescriptionAssessmentPrompt($title, $description);

        try {
            $response = $this->callGemini($prompt);
            $result = $this->parseDescriptionAssessmentResponse($response);

            BookContentClassification::cacheDescription($title, $description, $author, $externalId, $externalProvider, $result);

            Log::info('[LLMConsultant] Description assessed', [
                'title' => $title,
                'quality' => $result->quality->value,
                'isUsable' => $result->isUsable,
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('[LLMConsultant] Description assessment failed', [
                'title' => $title,
                'error' => $e->getMessage(),
            ]);

            return $this->defaultDescriptionAssessment();
        }
    }

    /**
     * Classify book content for audience, intensity, and mood.
     *
     * @param  string  $title  The book title
     * @param  string|null  $description  The book description
     * @param  string|null  $author  The author name
     * @param  array<string>  $genres  Known genres
     * @param  string|null  $externalId  External ID for caching
     * @param  string|null  $externalProvider  External provider for caching
     */
    public function classifyContent(
        string $title,
        ?string $description,
        ?string $author,
        array $genres = [],
        ?string $externalId = null,
        ?string $externalProvider = null
    ): ContentClassificationDTO {
        $cached = BookContentClassification::findByContent($title, $description, $author);
        if ($cached && $cached->content_confidence > 0) {
            Log::debug('[LLMConsultant] Using cached content classification', ['title' => $title]);

            return $cached->getContentClassification();
        }

        if (! $this->isEnabled()) {
            Log::info('[LLMConsultant] LLM disabled, returning empty classification');

            return $this->defaultContentClassification();
        }

        $prompt = $this->buildContentClassificationPrompt($title, $description, $author, $genres);

        try {
            $response = $this->callGemini($prompt);
            $result = $this->parseContentClassificationResponse($response);

            BookContentClassification::cacheContent($title, $description, $author, $externalId, $externalProvider, $result);

            Log::info('[LLMConsultant] Content classified', [
                'title' => $title,
                'audience' => $result->audience?->value,
                'intensity' => $result->intensity?->value,
                'moods' => array_map(fn (MoodEnum $m) => $m->value, $result->moods),
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('[LLMConsultant] Content classification failed', [
                'title' => $title,
                'error' => $e->getMessage(),
            ]);

            return $this->defaultContentClassification();
        }
    }

    /**
     * Extract series information from book content.
     *
     * Used when title-based regex patterns don't find series info.
     *
     * @param  string  $title  The book title
     * @param  string|null  $description  The book description
     * @param  string|null  $author  The author name
     * @param  string|null  $externalId  External ID for caching
     * @param  string|null  $externalProvider  External provider for caching
     */
    public function extractSeriesInfo(
        string $title,
        ?string $description,
        ?string $author,
        ?string $externalId = null,
        ?string $externalProvider = null
    ): SeriesExtractionDTO {
        $cached = BookContentClassification::findByContent($title, $description, $author);
        if ($cached && $cached->series_confidence > 0) {
            Log::debug('[LLMConsultant] Using cached series extraction', ['title' => $title]);

            return $cached->getSeriesExtraction();
        }

        if (! $this->isEnabled() || empty($description)) {
            Log::info('[LLMConsultant] LLM disabled or no description, returning empty extraction');

            return $this->defaultSeriesExtraction();
        }

        $prompt = $this->buildSeriesExtractionPrompt($title, $description, $author);

        try {
            $response = $this->callGemini($prompt);
            $result = $this->parseSeriesExtractionResponse($response);

            BookContentClassification::cacheSeries($title, $description, $author, $externalId, $externalProvider, $result);

            Log::info('[LLMConsultant] Series info extracted', [
                'title' => $title,
                'seriesMentioned' => $result->seriesMentioned,
                'seriesName' => $result->seriesName,
                'confidence' => $result->confidence,
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('[LLMConsultant] Series extraction failed', [
                'title' => $title,
                'error' => $e->getMessage(),
            ]);

            return $this->defaultSeriesExtraction();
        }
    }

    /**
     * Run all classifications on a book in a single LLM call.
     *
     * More efficient than calling each method separately.
     *
     * @param  string  $title  The book title
     * @param  string|null  $description  The book description
     * @param  string|null  $author  The author name
     * @param  array<string>  $genres  Known genres
     * @param  string|null  $externalId  External ID for caching
     * @param  string|null  $externalProvider  External provider for caching
     * @return array{description: DescriptionAssessmentDTO, content: ContentClassificationDTO, series: SeriesExtractionDTO, vibes: VibeClassificationDTO}
     */
    public function classifyBook(
        string $title,
        ?string $description,
        ?string $author,
        array $genres = [],
        ?string $externalId = null,
        ?string $externalProvider = null
    ): array {
        $cached = BookContentClassification::findByContent($title, $description, $author);
        if ($cached?->hasCompleteClassificationWithVibes()) {
            Log::debug('[LLMConsultant] Using fully cached classification with vibes', ['title' => $title]);

            return [
                'description' => $cached->getDescriptionAssessment(),
                'content' => $cached->getContentClassification(),
                'series' => $cached->getSeriesExtraction(),
                'vibes' => $cached->getVibeClassification(),
            ];
        }

        if (! $this->isEnabled()) {
            return $this->defaultClassifications();
        }

        $prompt = $this->buildCombinedClassificationPrompt($title, $description, $author, $genres);

        try {
            $response = $this->callGemini($prompt);
            $results = $this->parseCombinedClassificationResponse($response);

            BookContentClassification::cacheAllWithVibes(
                $title,
                $description,
                $author,
                $externalId,
                $externalProvider,
                $results['description'],
                $results['content'],
                $results['series'],
                $results['vibes']
            );

            Log::info('[LLMConsultant] Book fully classified with vibes', [
                'title' => $title,
                'descriptionQuality' => $results['description']->quality->value,
                'audience' => $results['content']->audience?->value,
                'seriesMentioned' => $results['series']->seriesMentioned,
                'moodDarkness' => $results['vibes']->moodDarkness,
                'plotArchetype' => $results['vibes']->plotArchetype?->value,
            ]);

            return $results;
        } catch (\Exception $e) {
            Log::error('[LLMConsultant] Combined classification failed', [
                'title' => $title,
                'error' => $e->getMessage(),
            ]);

            return $this->defaultClassifications();
        }
    }

    /**
     * Classify only the vibe characteristics for backfilling existing books.
     *
     * @param  string  $title  The book title
     * @param  string|null  $description  The book description
     * @param  string|null  $author  The author name
     * @param  array<string>  $genres  Known genres
     * @param  string|null  $externalId  External ID for caching
     * @param  string|null  $externalProvider  External provider for caching
     */
    public function classifyVibesOnly(
        string $title,
        ?string $description,
        ?string $author,
        array $genres = [],
        ?string $externalId = null,
        ?string $externalProvider = null
    ): VibeClassificationDTO {
        $cached = BookContentClassification::findByContent($title, $description, $author);
        if ($cached && $cached->vibe_confidence > 0) {
            Log::debug('[LLMConsultant] Using cached vibe classification', ['title' => $title]);

            return $cached->getVibeClassification();
        }

        if (! $this->isEnabled()) {
            Log::info('[LLMConsultant] LLM disabled, returning empty vibe classification');

            return $this->defaultVibeClassification();
        }

        $prompt = $this->buildVibePrompt($title, $description, $author, $genres);

        try {
            $response = $this->callGemini($prompt);
            $result = $this->parseVibeResponse($response);

            BookContentClassification::cacheVibes($title, $description, $author, $externalId, $externalProvider, $result);

            Log::info('[LLMConsultant] Vibes classified', [
                'title' => $title,
                'moodDarkness' => $result->moodDarkness,
                'pacingSpeed' => $result->pacingSpeed,
                'plotArchetype' => $result->plotArchetype?->value,
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('[LLMConsultant] Vibe classification failed', [
                'title' => $title,
                'error' => $e->getMessage(),
            ]);

            return $this->defaultVibeClassification();
        }
    }

    /**
     * Check if LLM is enabled.
     */
    public function isEnabled(): bool
    {
        return config('ingestion.llm.enabled', false)
            && ! empty(config('ingestion.llm.api_key'));
    }

    /**
     * Build prompt for genre resolution.
     */
    private function buildGenrePrompt(string $unknownGenre, string $canonicalGenres): string
    {
        return <<<PROMPT
You are a librarian helping to categorize books. Given a genre label, match it to the most appropriate canonical genre.

Unknown genre: "{$unknownGenre}"

Available canonical genres: {$canonicalGenres}

Respond with ONLY the exact name of the best matching canonical genre from the list above.
If none of the canonical genres are a good match, respond with "NONE".

Your response (just the genre name or NONE):
PROMPT;
    }

    /**
     * Build prompt for genre enrichment from book content.
     */
    private function buildGenreEnrichmentPrompt(
        string $title,
        ?string $description,
        ?string $author,
        string $canonicalGenres
    ): string {
        $descriptionPart = $description
            ? "Description: \"{$description}\""
            : 'Description: Not available';

        $authorPart = $author ? "Author: {$author}" : '';

        return <<<PROMPT
You are an expert librarian categorizing books. Determine the most accurate genres based on all available information.

Book Title: "{$title}"
{$authorPart}
{$descriptionPart}

Available genres: {$canonicalGenres}

IMPORTANT GUIDELINES:
1. If you recognize the author, consider what genres they typically write in
2. Use context clues from the title and description (magic, spaceships, detective, romance, etc.)
3. Choose the most SPECIFIC genre that applies - prefer "Fantasy" over "Literary Fiction" for fantasy books
4. "Literary Fiction" should only be used for character-driven literary works, NOT for genre fiction

Select 1-3 genres. Respond with ONLY the genre names, comma-separated.
Example: Fantasy, Adventure

Your response:
PROMPT;
    }

    /**
     * Parse genre enrichment response from LLM.
     *
     * @return array<GenreEnum>
     */
    private function parseGenreEnrichmentResponse(string $response): array
    {
        $response = trim($response);

        if (empty($response) || strtoupper($response) === 'NONE') {
            return [];
        }

        $genreStrings = array_map('trim', explode(',', $response));
        $matchedGenres = [];

        foreach ($genreStrings as $genreString) {
            $normalizedGenre = strtolower($genreString);

            foreach (GenreEnum::cases() as $genre) {
                if (strtolower($genre->label()) === $normalizedGenre) {
                    $matchedGenres[] = $genre;
                    break;
                }

                if (strtolower(str_replace('_', ' ', $genre->value)) === $normalizedGenre) {
                    $matchedGenres[] = $genre;
                    break;
                }
            }
        }

        return array_slice(array_unique($matchedGenres, SORT_REGULAR), 0, 3);
    }

    /**
     * Build prompt for author resolution.
     */
    private function buildAuthorPrompt(string $ambiguousName, string $candidates): string
    {
        return <<<PROMPT
You are a librarian helping to identify authors. Given an author name that may be a variant or pseudonym, match it to the correct canonical author.

Author name to match: "{$ambiguousName}"

Possible matches: {$candidates}

Respond with ONLY the exact name of the correct author from the list above.
If none of the authors match, respond with "NONE".

Your response (just the author name or NONE):
PROMPT;
    }

    /**
     * Call Gemini API.
     */
    private function callGemini(string $prompt, int $maxTokens = 8192): string
    {
        $apiKey = config('ingestion.llm.api_key');
        $model = config('ingestion.llm.model', 'gemini-2.0-flash');
        $timeout = config('ingestion.llm.timeout', 30);

        $url = self::GEMINI_API_URL."/{$model}:generateContent?key={$apiKey}";

        $response = Http::timeout($timeout)
            ->retry(config('ingestion.llm.max_retries', 2), 1000)
            ->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.1,
                    'maxOutputTokens' => $maxTokens,
                ],
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Gemini API error: '.$response->body());
        }

        $data = $response->json();

        return $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
    }

    /**
     * Parse genre response from LLM.
     */
    private function parseGenreResponse(string $response): ?GenreEnum
    {
        $response = trim($response);

        if (strtoupper($response) === 'NONE') {
            return null;
        }

        $normalizedResponse = strtolower($response);

        foreach (GenreEnum::cases() as $genre) {
            if (strtolower($genre->label()) === $normalizedResponse) {
                return $genre;
            }

            if (strtolower(str_replace('_', ' ', $genre->value)) === $normalizedResponse) {
                return $genre;
            }
        }

        foreach (GenreEnum::cases() as $genre) {
            if (str_contains($normalizedResponse, strtolower($genre->label()))) {
                return $genre;
            }
        }

        return null;
    }

    /**
     * Parse author response from LLM.
     *
     * @param  array<Author>  $candidates
     */
    private function parseAuthorResponse(string $response, array $candidates): ?Author
    {
        $response = trim($response);

        if (strtoupper($response) === 'NONE') {
            return null;
        }

        $normalizedResponse = strtolower($response);

        foreach ($candidates as $author) {
            if (strtolower($author->name) === $normalizedResponse) {
                return $author;
            }
        }

        foreach ($candidates as $author) {
            if (str_contains($normalizedResponse, strtolower($author->name))) {
                return $author;
            }
        }

        return null;
    }

    /**
     * Build prompt for description quality assessment.
     */
    private function buildDescriptionAssessmentPrompt(string $title, string $description): string
    {
        $truncatedDesc = mb_substr($description, 0, 2000);

        return <<<PROMPT
You are a librarian assessing book description quality. Analyze this description and classify it.

Book Title: "{$title}"

Description:
"{$truncatedDesc}"

Assess the following (respond in JSON format):

1. quality: "good" | "fair" | "poor"
   - good: Informative, well-written, gives clear sense of the book
   - fair: Basic information but missing depth or has minor issues
   - poor: Unhelpful, too vague, or problematic

2. is_usable: true | false
   - Can this description be shown to users?

3. is_promotional: true | false
   - Contains marketing language like "bestseller", "must-read", "buy now", award mentions that dominate content

4. is_truncated: true | false
   - Appears to be cut off mid-sentence or incomplete

5. has_spoilers: true | false
   - Reveals major plot points, endings, or twists beyond the premise

6. confidence: 0.0 to 1.0
   - Your confidence in this assessment

Respond with ONLY valid JSON, no explanation:
{"quality": "...", "is_usable": true/false, "is_promotional": true/false, "is_truncated": true/false, "has_spoilers": true/false, "confidence": 0.0}
PROMPT;
    }

    /**
     * Parse description assessment response.
     */
    private function parseDescriptionAssessmentResponse(string $response): DescriptionAssessmentDTO
    {
        $data = $this->parseJsonResponse($response);

        return $data !== null
            ? DescriptionAssessmentDTO::fromArray($data)
            : $this->defaultDescriptionAssessment();
    }

    /**
     * Build prompt for content classification.
     *
     * @param  array<string>  $genres
     */
    private function buildContentClassificationPrompt(
        string $title,
        ?string $description,
        ?string $author,
        array $genres
    ): string {
        $descPart = $description ? mb_substr($description, 0, 1500) : 'Not available';
        $authorPart = $author ?: 'Unknown';
        $genrePart = ! empty($genres) ? implode(', ', $genres) : 'Unknown';

        $audienceOptions = implode(', ', array_map(fn ($c) => $c->value, AudienceEnum::cases()));
        $intensityOptions = implode(', ', array_map(fn ($c) => $c->value, ContentIntensityEnum::cases()));
        $moodOptions = implode(', ', array_map(fn ($c) => $c->value, MoodEnum::cases()));

        return <<<PROMPT
You are a librarian classifying book content. Analyze this book and classify it.

Book Title: "{$title}"
Author: {$authorPart}
Known Genres: {$genrePart}
Description: "{$descPart}"

Classify the following (respond in JSON format):

1. audience: {$audienceOptions}
   - adult: Mature themes, complex content for 18+
   - young_adult: Teen-appropriate (13-17), coming-of-age themes
   - middle_grade: Ages 9-12, adventure/friendship focused
   - children: Ages 0-8, simple language, educational

2. intensity: {$intensityOptions}
   - light: Uplifting, cozy, humorous, feel-good
   - moderate: Balanced with some tension or conflict
   - dark: Heavy themes, violence, mature content
   - intense: Graphic content, extreme themes, disturbing

3. moods: Array of 1-3 values from [{$moodOptions}]
   - Select moods that best describe the emotional tone

4. confidence: 0.0 to 1.0

Respond with ONLY valid JSON:
{"audience": "...", "intensity": "...", "moods": ["...", "..."], "confidence": 0.0}
PROMPT;
    }

    /**
     * Parse content classification response.
     */
    private function parseContentClassificationResponse(string $response): ContentClassificationDTO
    {
        $data = $this->parseJsonResponse($response);

        return $data !== null
            ? ContentClassificationDTO::fromArray($data)
            : $this->defaultContentClassification();
    }

    /**
     * Build prompt for series extraction.
     */
    private function buildSeriesExtractionPrompt(string $title, ?string $description, ?string $author): string
    {
        $descPart = $description ? mb_substr($description, 0, 1500) : '';
        $authorPart = $author ?: 'Unknown';

        $positionOptions = implode(', ', array_map(fn ($c) => $c->value, SeriesPositionEnum::cases()));

        return <<<PROMPT
You are a librarian identifying series information from book descriptions. Extract any series mentions.

Book Title: "{$title}"
Author: {$authorPart}
Description: "{$descPart}"

Look for phrases like:
- "Book 1 in the X series"
- "The second installment of..."
- "The thrilling conclusion to..."
- "A standalone novel in the X world"
- "Returns to the world of..."

Extract (respond in JSON format):

1. series_mentioned: true | false
   - Is this book part of a series based on the description?

2. series_name: string | null
   - The exact series name as mentioned (extract verbatim, do not invent)

3. position_hint: {$positionOptions} | null
   - first: First book, beginning, introduces
   - middle: Continues, book 2-N (not last)
   - conclusion: Final, last, concludes
   - standalone: Can be read alone, not part of numbered sequence
   - prequel: Takes place before main series
   - spinoff: Related but separate story/characters

4. volume_hint: number | null
   - If a specific number is mentioned (Book 3, Volume 2, etc.)

5. confidence: 0.0 to 1.0
   - Only high confidence (0.8+) if series name is explicitly stated

IMPORTANT: Only extract series info that is EXPLICITLY mentioned. Do not guess or infer.
If no series is mentioned, set series_mentioned to false.

Respond with ONLY valid JSON:
{"series_mentioned": true/false, "series_name": "..." or null, "position_hint": "..." or null, "volume_hint": N or null, "confidence": 0.0}
PROMPT;
    }

    /**
     * Parse series extraction response.
     */
    private function parseSeriesExtractionResponse(string $response): SeriesExtractionDTO
    {
        $data = $this->parseJsonResponse($response);

        return $data !== null
            ? SeriesExtractionDTO::fromArray($data)
            : $this->defaultSeriesExtraction();
    }

    /**
     * Build combined classification prompt for efficiency.
     *
     * @param  array<string>  $genres
     */
    private function buildCombinedClassificationPrompt(
        string $title,
        ?string $description,
        ?string $author,
        array $genres
    ): string {
        $descPart = $description ? mb_substr($description, 0, 1500) : 'Not available';
        $authorPart = $author ?: 'Unknown';
        $genrePart = ! empty($genres) ? implode(', ', $genres) : 'Unknown';

        $audienceOptions = implode(', ', array_map(fn ($c) => $c->value, AudienceEnum::cases()));
        $intensityOptions = implode(', ', array_map(fn ($c) => $c->value, ContentIntensityEnum::cases()));
        $moodOptions = implode(', ', array_map(fn ($c) => $c->value, MoodEnum::cases()));
        $positionOptions = implode(', ', array_map(fn ($c) => $c->value, SeriesPositionEnum::cases()));
        $plotArchetypeOptions = implode(', ', array_map(fn ($c) => $c->value, PlotArchetypeEnum::cases()));
        $proseStyleOptions = implode(', ', array_map(fn ($c) => $c->value, ProseStyleEnum::cases()));
        $settingOptions = implode(', ', array_map(fn ($c) => $c->value, SettingAtmosphereEnum::cases()));

        return <<<PROMPT
You are a librarian analyzing a book. Provide four classifications in a single JSON response.

Book Title: "{$title}"
Author: {$authorPart}
Known Genres: {$genrePart}
Description: "{$descPart}"

Respond with a JSON object containing four sections:

1. "description": Assess description quality
   - quality: "good" | "fair" | "poor"
   - is_usable: true | false
   - is_promotional: true | false (marketing language dominates)
   - is_truncated: true | false (cut off mid-sentence)
   - has_spoilers: true | false (reveals plot twists/endings)
   - confidence: 0.0-1.0

2. "content": Classify the book content
   - audience: {$audienceOptions}
   - intensity: {$intensityOptions}
   - moods: array of 1-3 from [{$moodOptions}]
   - confidence: 0.0-1.0

3. "series": Extract series information (only if EXPLICITLY mentioned)
   - series_mentioned: true | false
   - series_name: string or null (extract verbatim, never invent)
   - position_hint: {$positionOptions} or null
   - volume_hint: number or null
   - confidence: 0.0-1.0

4. "vibes": Analyze reading experience characteristics
   Rate on scale 1.0-10.0 (IMPORTANT: rate against genre norms, not absolute scale):
   - mood_darkness: 1.0=Cozy/whimsical, 10.0=Grimdark/disturbing
   - pacing_speed: 1.0=Slow burn/meditative, 10.0=Thriller/breakneck
   - complexity_score: 1.0=Beach read, 10.0=Academic/dense prose
   - emotional_intensity: 1.0=Detached/cerebral, 10.0=Tearjerker/gut-wrenching

   Categorical classifications:
   - plot_archetype: {$plotArchetypeOptions}
   - prose_style: {$proseStyleOptions}
   - setting_atmosphere: {$settingOptions}
   - confidence: 0.0-1.0

Respond with ONLY valid JSON:
{
  "description": {...},
  "content": {...},
  "series": {...},
  "vibes": {...}
}
PROMPT;
    }

    /**
     * Parse combined classification response.
     *
     * @return array{description: DescriptionAssessmentDTO, content: ContentClassificationDTO, series: SeriesExtractionDTO, vibes: VibeClassificationDTO}
     */
    private function parseCombinedClassificationResponse(string $response): array
    {
        $data = $this->parseJsonResponse($response);

        if ($data === null) {
            return $this->defaultClassifications();
        }

        $defaults = $this->defaultClassifications();

        return [
            'description' => isset($data['description'])
                ? DescriptionAssessmentDTO::fromArray($data['description'])
                : $defaults['description'],
            'content' => isset($data['content'])
                ? ContentClassificationDTO::fromArray($data['content'])
                : $defaults['content'],
            'series' => isset($data['series'])
                ? SeriesExtractionDTO::fromArray($data['series'])
                : $defaults['series'],
            'vibes' => isset($data['vibes'])
                ? VibeClassificationDTO::fromArray($data['vibes'])
                : $defaults['vibes'],
        ];
    }

    /**
     * Parse and clean JSON response from LLM.
     *
     * Handles markdown code fences and validates JSON structure.
     */
    private function parseJsonResponse(string $response): ?array
    {
        $response = trim($response);
        $response = preg_replace('/^```json\s*/i', '', $response);
        $response = preg_replace('/\s*```$/i', '', $response);

        $data = json_decode($response, true);

        return is_array($data) ? $data : null;
    }

    /**
     * Create default description assessment for fallback.
     */
    private function defaultDescriptionAssessment(): DescriptionAssessmentDTO
    {
        return new DescriptionAssessmentDTO(
            quality: DescriptionQualityEnum::Fair,
            isUsable: true,
            confidence: 0.0,
        );
    }

    /**
     * Create default content classification for fallback.
     */
    private function defaultContentClassification(): ContentClassificationDTO
    {
        return new ContentClassificationDTO(confidence: 0.0);
    }

    /**
     * Create default series extraction for fallback.
     */
    private function defaultSeriesExtraction(): SeriesExtractionDTO
    {
        return new SeriesExtractionDTO(confidence: 0.0);
    }

    /**
     * Create all default classifications for fallback.
     *
     * @return array{description: DescriptionAssessmentDTO, content: ContentClassificationDTO, series: SeriesExtractionDTO, vibes: VibeClassificationDTO}
     */
    private function defaultClassifications(): array
    {
        return [
            'description' => $this->defaultDescriptionAssessment(),
            'content' => $this->defaultContentClassification(),
            'series' => $this->defaultSeriesExtraction(),
            'vibes' => $this->defaultVibeClassification(),
        ];
    }

    /**
     * Create default vibe classification for fallback.
     */
    private function defaultVibeClassification(): VibeClassificationDTO
    {
        return new VibeClassificationDTO(confidence: 0.0);
    }

    /**
     * Build prompt for vibe-only classification (for backfilling).
     *
     * @param  array<string>  $genres
     */
    private function buildVibePrompt(
        string $title,
        ?string $description,
        ?string $author,
        array $genres
    ): string {
        $descPart = $description ? mb_substr($description, 0, 1500) : 'Not available';
        $authorPart = $author ?: 'Unknown';
        $genrePart = ! empty($genres) ? implode(', ', $genres) : 'Unknown';

        $plotArchetypeOptions = implode(', ', array_map(fn ($c) => $c->value, PlotArchetypeEnum::cases()));
        $proseStyleOptions = implode(', ', array_map(fn ($c) => $c->value, ProseStyleEnum::cases()));
        $settingOptions = implode(', ', array_map(fn ($c) => $c->value, SettingAtmosphereEnum::cases()));

        return <<<PROMPT
You are a librarian analyzing a book's reading experience characteristics.

Book Title: "{$title}"
Author: {$authorPart}
Known Genres: {$genrePart}
Description: "{$descPart}"

Analyze the reading experience and respond with a JSON object:

Rate on scale 1.0-10.0 (IMPORTANT: rate against genre norms, not absolute scale):
- mood_darkness: 1.0=Cozy/whimsical, 10.0=Grimdark/disturbing
- pacing_speed: 1.0=Slow burn/meditative, 10.0=Thriller/breakneck
- complexity_score: 1.0=Beach read, 10.0=Academic/dense prose
- emotional_intensity: 1.0=Detached/cerebral, 10.0=Tearjerker/gut-wrenching

Categorical classifications:
- plot_archetype: {$plotArchetypeOptions}
- prose_style: {$proseStyleOptions}
- setting_atmosphere: {$settingOptions}
- confidence: 0.0-1.0

Respond with ONLY valid JSON:
{
  "mood_darkness": 5.0,
  "pacing_speed": 5.0,
  "complexity_score": 5.0,
  "emotional_intensity": 5.0,
  "plot_archetype": "...",
  "prose_style": "...",
  "setting_atmosphere": "...",
  "confidence": 0.0
}
PROMPT;
    }

    /**
     * Parse vibe-only classification response.
     */
    private function parseVibeResponse(string $response): VibeClassificationDTO
    {
        $data = $this->parseJsonResponse($response);

        return $data !== null
            ? VibeClassificationDTO::fromArray($data)
            : $this->defaultVibeClassification();
    }
}
