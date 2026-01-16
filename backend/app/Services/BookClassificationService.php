<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Ingestion\ContentClassificationDTO;
use App\Enums\MoodEnum;
use App\Models\Book;
use App\Services\Concerns\ClassifiesContent;
use App\Services\Ingestion\LLM\LLMConsultant;
use InvalidArgumentException;
use RuntimeException;

/**
 * Service for classifying books using LLM.
 *
 * Uses combined classification (description + content + series) for user library books.
 */
class BookClassificationService
{
    use ClassifiesContent;

    public function __construct(
        protected LLMConsultant $llmConsultant
    ) {}

    /**
     * Classify a book and update its attributes.
     *
     * @throws InvalidArgumentException If book has no description
     * @throws RuntimeException If LLM response is invalid
     */
    public function classify(Book $book, ?array $genres = null): ContentClassificationDTO
    {
        if (empty($book->description)) {
            throw new InvalidArgumentException('Book must have a description to classify');
        }

        $genres ??= $this->getGenresForClassification($book);

        $result = $this->llmConsultant->classifyBook(
            title: $book->title,
            description: $book->description,
            author: $book->author,
            genres: $genres,
            externalId: $book->external_id,
            externalProvider: $book->external_provider,
        );

        if (! isset($result['content']) || ! $result['content'] instanceof ContentClassificationDTO) {
            throw new RuntimeException('Invalid classification response from LLM');
        }

        $contentClassification = $result['content'];

        $book->update([
            'audience' => $contentClassification->audience,
            'intensity' => $contentClassification->intensity,
            'moods' => array_map(fn (MoodEnum $m) => $m->value, $contentClassification->moods),
            'classification_confidence' => $contentClassification->confidence,
            'is_classified' => true,
        ]);

        return $contentClassification;
    }

    /**
     * Force reclassify a book, ignoring existing classification.
     *
     * @throws InvalidArgumentException If book has no description
     * @throws RuntimeException If LLM response is invalid
     */
    public function reclassify(Book $book, ?array $genres = null): ContentClassificationDTO
    {
        $book->update(['is_classified' => false]);

        return $this->classify($book, $genres);
    }
}
