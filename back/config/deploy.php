<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Front app path (sibling of /back)
    |--------------------------------------------------------------------------
    |
    | Relative to the Laravel application root (the /back directory).
    |
    */

    'front_path' => env('DEPLOY_FRONT_PATH', '../front'),

    /*
    |--------------------------------------------------------------------------
    | SSH
    |--------------------------------------------------------------------------
    */

    'ssh' => [
        'key' => env('DEPLOY_SSH_KEY', '~/.ssh/namecheap_key'),
        'port' => (int) env('DEPLOY_SSH_PORT', 21098),
        'user' => env('DEPLOY_SSH_USER', 'amazphwz'),
        'host' => env('DEPLOY_SSH_HOST', 'crm-amazonltd.online'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Remote paths (home-relative or absolute on the server)
    |--------------------------------------------------------------------------
    */

    'remote' => [
        'repo_dir' => env('DEPLOY_REMOTE_REPO_DIR', '~/Amazon-Marine-System'),
        'public_front' => env('DEPLOY_REMOTE_PUBLIC_FRONT', '~/public_html/front'),
    ],

];
