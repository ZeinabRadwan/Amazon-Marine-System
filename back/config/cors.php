<?php

// Do NOT run `php artisan config:publish cors` after editing this file — it replaces this file with the default stub.

$raw = env('CORS_ALLOWED_ORIGINS');

if ($raw === '*') {
    $allowedOrigins = ['*'];
} elseif (is_string($raw) && trim($raw) !== '') {
    $allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $raw))));
} else {
    $allowedOrigins = [
        'https://crm-amazonltd.online',
        'https://www.crm-amazonltd.online',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];
}

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    | Mobile Safari/WebKit often rejects Access-Control-Allow-Origin: * for
    | JSON POSTs (preflight). Use explicit origins — set CORS_ALLOWED_ORIGINS
    | in .env (comma-separated) or rely on the defaults below.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => false,

];
