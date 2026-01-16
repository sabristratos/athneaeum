<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Metadata Sources
    |--------------------------------------------------------------------------
    |
    | Configure available metadata sources and their priorities.
    | Lower priority number = higher preference (1 is highest).
    |
    */
    'sources' => [
        'open_library' => [
            'enabled' => true,
            'priority' => 10,
        ],
        'google_books' => [
            'enabled' => env('GOOGLE_BOOKS_API_KEY') !== null,
            'priority' => 20,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Field Priorities
    |--------------------------------------------------------------------------
    |
    | Configure which source to prefer for each field.
    | Lower number = higher preference. Used by FieldMerger.
    |
    */
    'field_priorities' => [
        'title' => [
            'open_library' => 10,
            'google_books' => 20,
        ],
        'author' => [
            'open_library' => 10,
            'google_books' => 20,
        ],
        'description' => [
            'google_books' => 10,
            'open_library' => 20,
        ],
        'coverUrl' => [
            'open_library' => 10,
            'google_books' => 20,
        ],
        'pageCount' => [
            'google_books' => 10,
            'open_library' => 20,
        ],
        'publishedDate' => [
            'open_library' => 10,
            'google_books' => 20,
        ],
        'publisher' => [
            'google_books' => 10,
            'open_library' => 20,
        ],
        'isbn' => [
            'open_library' => 10,
            'google_books' => 15,
        ],
        'isbn13' => [
            'open_library' => 10,
            'google_books' => 15,
        ],
        'genres' => [
            'open_library' => 10,
            'google_books' => 20,
        ],
        'seriesName' => [
            'google_books' => 10,
            'open_library' => 20,
        ],
        'volumeNumber' => [
            'google_books' => 10,
            'open_library' => 20,
        ],
        'language' => [
            'google_books' => 10,
            'open_library' => 20,
        ],
        'averageRating' => [
            'google_books' => 10,
            'open_library' => 50,
        ],
        'ratingsCount' => [
            'google_books' => 10,
            'open_library' => 50,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Parallel Query Settings
    |--------------------------------------------------------------------------
    |
    | Parallel queries use Laravel's Http::pool for concurrent requests.
    | Currently disabled by default as sequential queries are more reliable.
    |
    */
    'parallel' => [
        'timeout' => 15,
        'enabled' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Scoring Weights
    |--------------------------------------------------------------------------
    |
    | Configurable weights for the result scoring algorithm.
    |
    */
    'scoring' => [
        'identifier_match' => 1000,
        'exact_title' => 100,
        'author_match' => 50,
        'has_cover' => 25,
        'has_description' => 15,
        'per_field' => 5,
        'max_completeness' => 50,
    ],
];
