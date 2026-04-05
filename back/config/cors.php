<?php

// Do NOT run `php artisan config:publish cors` after editing this file — it replaces this file with the default stub.

/**
 * Origins that must always be allowed for this product (SPA + local dev).
 * Env CORS_ALLOWED_ORIGINS is merged in so production cannot accidentally drop the CRM front URL.
 */
$defaultOrigins = [
    'https://crm-amazonltd.online',
    'https://www.crm-amazonltd.online',
    'https://crm-amazonltd.live',
    'https://www.crm-amazonltd.live',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

$raw = env('CORS_ALLOWED_ORIGINS');

// Safari/WebKit often blocks credentialed or preflight flows when ACAO is literally "*".
if ($raw === '*') {
    $allowedOrigins = $defaultOrigins;
} elseif (is_string($raw) && trim($raw) !== '') {
    $fromEnv = array_values(array_filter(array_map('trim', explode(',', $raw))));
    $allowedOrigins = array_values(array_unique(array_merge($defaultOrigins, $fromEnv)));
} else {
    $allowedOrigins = $defaultOrigins;
}

/*
| Regexes checked against the request Origin header (in addition to allowed_origins).
| Covers any subdomain (e.g. future staging) without editing .env.
*/
$allowedOriginPatterns = [
    '#^https://([a-z0-9-]+\.)*crm-amazonltd\.(online|live)$#i',
    '#^http://localhost(:\d+)?$#',
    '#^http://127\.0\.0\.1(:\d+)?$#',
];

$extraPatterns = env('CORS_ALLOWED_ORIGIN_PATTERNS');
if (is_string($extraPatterns) && trim($extraPatterns) !== '') {
    foreach (array_filter(array_map('trim', explode(',', $extraPatterns))) as $p) {
        $allowedOriginPatterns[] = $p;
    }
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
    | JSON POSTs (preflight). Avoid CORS_ALLOWED_ORIGINS=* in production.
    |
    | Optional: CORS_ALLOWED_ORIGIN_PATTERNS — comma-separated regex strings
    | (e.g. #^https://app\.example\.com$#).
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => $allowedOriginPatterns,

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => false,

];
