<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Fuzzy Matching Threshold
    |--------------------------------------------------------------------------
    |
    | The similarity threshold (0.0 to 1.0) used for fuzzy matching authors
    | and other entities. Higher values require closer matches.
    |
    */
    'fuzzy_match_threshold' => 0.85,

    /*
    |--------------------------------------------------------------------------
    | Author Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for author name processing.
    |
    */
    'author' => [
        'name_particles' => ['von', 'van', 'de', 'del', 'della', 'di', 'da', 'le', 'la', 'du', 'des'],
    ],

    /*
    |--------------------------------------------------------------------------
    | LLM Configuration (Level 2 Consultant)
    |--------------------------------------------------------------------------
    |
    | Settings for the LLM-based resolution of ambiguous data.
    | Only used when Level 1 (code-based) cleaning fails.
    |
    */
    'llm' => [
        'enabled' => env('INGESTION_LLM_ENABLED', false),
        'provider' => env('INGESTION_LLM_PROVIDER', 'gemini'),
        'model' => env('INGESTION_LLM_MODEL', 'gemini-2.5-flash'),
        'api_key' => env('GEMINI_API_KEY'),
        'timeout' => 30,
        'max_retries' => 2,
    ],

    /*
    |--------------------------------------------------------------------------
    | Caching Configuration
    |--------------------------------------------------------------------------
    |
    | LLM decisions are cached permanently in the database to avoid
    | repeated API calls for the same data.
    |
    */
    'cache' => [
        'genre_mappings_table' => 'genre_mappings',
        'author_aliases_table' => 'author_aliases',
        'content_classifications_table' => 'book_content_classifications',
    ],

    /*
    |--------------------------------------------------------------------------
    | Content Classification Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for the LLM-based content classification features:
    | description assessment, content classification, and series extraction.
    |
    */
    'classification' => [
        'enabled' => env('INGESTION_CLASSIFICATION_ENABLED', true),

        'auto_classify_on_ingest' => env('INGESTION_AUTO_CLASSIFY', true),

        'series_confidence_threshold' => 0.7,

        'description_min_length' => 50,
    ],
];
