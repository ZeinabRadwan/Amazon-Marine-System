<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Http;

$r = Http::withHeaders([
    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept' => 'text/html,application/xhtml+xml',
])->timeout(20)->get('https://www.cbe.org.eg/en/economic-research/statistics/exchange-rates');

echo 'status='.$r->status().' len='.strlen($r->body())."\n";
echo substr($r->body(), 0, 200);
