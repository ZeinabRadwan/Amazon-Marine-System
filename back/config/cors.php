<?php

// Do NOT run `php artisan config:publish cors` after editing this file — it replaces this file with the default stub.

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['https://crm-amazonltd.live'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => false,

];
