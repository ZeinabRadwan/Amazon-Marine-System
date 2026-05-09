<?php

$url = 'https://www.cbe.org.eg/en/economic-research/statistics/exchange-rates';
$ctx = stream_context_create([
    'http' => [
        'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120\r\nAccept: text/html\r\n",
        'timeout' => 25,
    ],
    'ssl' => ['verify_peer' => true],
]);
$html = @file_get_contents($url, false, $ctx);
echo 'len=' . strlen((string) $html) . "\n";
echo substr((string) $html, 0, 1200);
