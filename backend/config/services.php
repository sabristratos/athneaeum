<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Book Search Services
    |--------------------------------------------------------------------------
    |
    | Configure which book search provider to use. Available providers:
    | - google_books: Google Books API (requires API key)
    | - open_library: Open Library API (free, no key required)
    |
    */

    'book_search' => [
        'provider' => env('BOOK_SEARCH_PROVIDER', 'google_books'),
        'timeout' => (int) env('BOOK_SEARCH_TIMEOUT', 15),
        'retry_attempts' => (int) env('BOOK_SEARCH_RETRY_ATTEMPTS', 3),
        'retry_delay_ms' => (int) env('BOOK_SEARCH_RETRY_DELAY_MS', 500),
        'circuit_breaker_threshold' => (int) env('BOOK_SEARCH_CIRCUIT_THRESHOLD', 5),
        'circuit_breaker_decay_seconds' => (int) env('BOOK_SEARCH_CIRCUIT_DECAY', 60),
    ],

    'google_books' => [
        'key' => env('GOOGLE_BOOKS_API_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | NYT Books API
    |--------------------------------------------------------------------------
    |
    | Configuration for the New York Times Books API.
    | Used for syncing bestseller data into the discovery catalog.
    |
    */

    'nyt' => [
        'api_key' => env('NYT_API_KEY'),
        'base_url' => env('NYT_BASE_URL', 'https://api.nytimes.com/svc/books/v3'),
        'rate_limit_delay' => (int) env('NYT_RATE_LIMIT_DELAY', 6),
    ],

];
