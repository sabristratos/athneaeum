<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Embedding Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for the embedding service used to generate vector representations
    | of books for semantic similarity search.
    |
    */

    'embedding' => [
        'enabled' => env('DISCOVERY_EMBEDDING_ENABLED', true),
        'provider' => env('DISCOVERY_EMBEDDING_PROVIDER', 'gemini'),
        'model' => env('DISCOVERY_EMBEDDING_MODEL', 'text-embedding-004'),
        'dimension' => 768,
        'api_key' => env('GEMINI_API_KEY'),
        'timeout' => 30,
        'batch_size' => 100,
        'max_text_length' => 8000,
    ],

    /*
    |--------------------------------------------------------------------------
    | Recommendation Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for the recommendation engine including limits, thresholds,
    | and personalization parameters.
    |
    */

    'recommendation' => [
        'user_books_for_vector' => 5,
        'personalized_limit' => 20,
        'trending_limit' => 20,
        'genre_section_limit' => 15,
        'similar_books_limit' => 10,
        'min_similarity_score' => 0.5,
    ],

    /*
    |--------------------------------------------------------------------------
    | User Signal Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for tracking and weighting user interaction signals.
    |
    */

    'signals' => [
        'retention_days' => 90,
        'weights' => [
            'view' => 0.1,
            'click' => 0.3,
            'add_to_library' => 1.0,
            'dismiss' => -0.5,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Catalog Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for catalog ingestion and management.
    |
    */

    'catalog' => [
        'initial_embed_count' => 5000,
        'chunk_size' => 500,
        'embedding_delay_seconds' => 5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Classification Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for LLM-based book classification (mood, intensity, audience).
    |
    */

    'classification' => [
        'batch_size' => 50,
        'rate_limit_per_minute' => 30,
        'confidence_threshold' => 0.7,
    ],

    /*
    |--------------------------------------------------------------------------
    | Hybrid Recommendation Weights
    |--------------------------------------------------------------------------
    |
    | Weights for combining semantic similarity and classification match
    | when computing similar books. Used in RecommendationService.
    |
    */

    'hybrid_weights' => [
        'semantic' => 0.7,
        'classification' => 0.3,
    ],

    /*
    |--------------------------------------------------------------------------
    | Preference Boost Weights
    |--------------------------------------------------------------------------
    |
    | Weights for boosting books that match user preferences.
    | Applied as score multipliers in personalized feed ranking.
    |
    */

    'preference_boosts' => [
        'favorite_author' => 1.25,
        'favorite_series' => 1.20,
        'favorite_format' => 1.10,
        'positive_signal' => 1.15,
    ],

    /*
    |--------------------------------------------------------------------------
    | Feed Section Configuration
    |--------------------------------------------------------------------------
    |
    | Limits for various feed sections.
    |
    */

    'feed_sections' => [
        'author_section_limit' => 15,
        'max_author_sections' => 2,
        'series_section_limit' => 10,
        'max_series_sections' => 2,
    ],

    /*
    |--------------------------------------------------------------------------
    | Cover Storage Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for local cover image storage.
    |
    */

    'covers' => [
        'disk' => 'public',
        'path' => 'covers',
        'thumb_path' => 'covers/thumbs',
        'max_width' => 400,
        'max_height' => 600,
        'thumb_width' => 100,
        'thumb_height' => 150,
        'quality' => 85,
    ],

    /*
    |--------------------------------------------------------------------------
    | Master Books Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for the unified book registry.
    |
    */

    'master_books' => [
        'min_local_coverage' => 10,
        'fuzzy_match_threshold' => 0.85,
        'enrichment_delay_seconds' => 5,
        'min_user_count_for_embedding' => 2,
    ],

];
