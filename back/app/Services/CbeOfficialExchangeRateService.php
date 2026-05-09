<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Fetches official Central Bank of Egypt (CBE) average market buy/sell rates and derives cross rates.
 * Source: https://www.cbe.org.eg/en/economic-research/statistics/exchange-rates
 *
 * No static fallbacks: on failure callers must show empty/loading, not invented numbers.
 */
class CbeOfficialExchangeRateService
{
    public const DEFAULT_URL = 'https://www.cbe.org.eg/en/economic-research/statistics/exchange-rates';

    /**
     * @return array{
     *   source: string,
     *   source_url: string,
     *   as_of: string|null,
     *   usd: array{buy: float, sell: float, mid: float},
     *   eur: array{buy: float, sell: float, mid: float},
     *   pairs: list<array{id: string, from: string, to: string, label_key: string, rate: float}>,
     *   fetched_at: string
     * }
     */
    public function fetch(?string $url = null): array
    {
        $url = $url ?: config('services.cbe_fx.url', self::DEFAULT_URL);
        $timeout = (int) config('services.cbe_fx.timeout', 20);

        $response = Http::withHeaders([
            'User-Agent' => 'AmazonMarineSystem/1.0 (treasury; +https://www.cbe.org.eg)',
            'Accept' => 'text/html,application/xhtml+xml',
            'Accept-Language' => 'en-US,en;q=0.9',
        ])
            ->timeout($timeout)
            ->connectTimeout(10)
            ->get($url);

        if (! $response->successful()) {
            Log::warning('CBE FX fetch HTTP error', ['status' => $response->status(), 'url' => $url]);

            throw new RuntimeException('cbe_http_error');
        }

        $html = (string) $response->body();
        if (strlen($html) < 500) {
            Log::warning('CBE FX response too short', ['url' => $url]);

            throw new RuntimeException('cbe_empty_response');
        }

        $parsed = $this->parseCbeTable($html);
        if ($parsed === null) {
            Log::warning('CBE FX parse failed', ['url' => $url]);

            throw new RuntimeException('cbe_parse_failed');
        }

        ['as_of' => $asOf, 'rows' => $rows] = $parsed;
        $usd = $rows['USD'] ?? null;
        $eur = $rows['EUR'] ?? null;

        if ($usd === null || $eur === null) {
            throw new RuntimeException('cbe_missing_usd_eur');
        }

        $usdMid = $usd['mid'];
        $eurMid = $eur['mid'];

        if ($usdMid <= 0 || $eurMid <= 0 || ! is_finite($usdMid) || ! is_finite($eurMid)) {
            throw new RuntimeException('cbe_invalid_mid');
        }

        // CBE table is EGP per 1 unit of foreign currency.
        // USD → EUR: how many EUR for 1 USD = (EGP per USD) / (EGP per EUR).
        $usdToEur = $usdMid / $eurMid;
        $eurToUsd = $eurMid / $usdMid;

        if (! is_finite($usdToEur) || ! is_finite($eurToUsd) || $usdToEur <= 0 || $eurToUsd <= 0) {
            throw new RuntimeException('cbe_invalid_cross');
        }

        $fetchedAt = now()->toIso8601String();

        return [
            'source' => 'cbe.org.eg',
            'source_url' => $url,
            'as_of' => $asOf,
            'usd' => $usd,
            'eur' => $eur,
            'pairs' => [
                [
                    'id' => 'usd_egp',
                    'from' => 'USD',
                    'to' => 'EGP',
                    'label_key' => 'treasury.exchange.usdToEgp',
                    'rate' => round($usdMid, 4),
                ],
                [
                    'id' => 'eur_egp',
                    'from' => 'EUR',
                    'to' => 'EGP',
                    'label_key' => 'treasury.exchange.eurToEgp',
                    'rate' => round($eurMid, 4),
                ],
                [
                    'id' => 'usd_eur',
                    'from' => 'USD',
                    'to' => 'EUR',
                    'label_key' => 'treasury.exchange.usdToEur',
                    'rate' => round($usdToEur, 6),
                ],
                [
                    'id' => 'eur_usd',
                    'from' => 'EUR',
                    'to' => 'USD',
                    'label_key' => 'treasury.exchange.eurToUsd',
                    'rate' => round($eurToUsd, 6),
                ],
            ],
            'fetched_at' => $fetchedAt,
        ];
    }

    /**
     * @return array{as_of: string|null, rows: array<string, array{buy: float, sell: float, mid: float}>}|null
     */
    private function parseCbeTable(string $html): ?array
    {
        $asOf = null;
        if (preg_match('/Last Updated:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i', $html, $m)) {
            try {
                $asOf = \Carbon\Carbon::parse($m[1])->toDateString();
            } catch (\Throwable) {
                $asOf = null;
            }
        }

        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        @$dom->loadHTML('<?xml encoding="UTF-8">'.$html);
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);
        /** @var \DOMNodeList $rows */
        $rows = $xpath->query('//table//tr');

        $out = [];

        foreach ($rows as $tr) {
            $cells = $tr->getElementsByTagName('td');
            if ($cells->length < 3) {
                continue;
            }

            $name = strtolower(trim($cells->item(0)?->textContent ?? ''));
            $buyRaw = trim(str_replace(',', '', $cells->item(1)?->textContent ?? ''));
            $sellRaw = trim(str_replace(',', '', $cells->item(2)?->textContent ?? ''));

            if ($name === '' || ! is_numeric($buyRaw) || ! is_numeric($sellRaw)) {
                continue;
            }

            $buy = (float) $buyRaw;
            $sell = (float) $sellRaw;
            if ($buy <= 0 || $sell <= 0) {
                continue;
            }

            $mid = ($buy + $sell) / 2.0;

            $code = null;
            if (str_contains($name, 'us dollar')) {
                $code = 'USD';
            } elseif (str_contains($name, 'euro') && ! str_contains($name, 'europe')) {
                $code = 'EUR';
            }

            if ($code) {
                $out[$code] = [
                    'buy' => round($buy, 4),
                    'sell' => round($sell, 4),
                    'mid' => round($mid, 6),
                ];
            }
        }

        if ($out === []) {
            // Regex fallback when DOM layout shifts
            return $this->parseCbeRegexFallback($html, $asOf);
        }

        return ['as_of' => $asOf, 'rows' => $out];
    }

    /**
     * @return array{as_of: string|null, rows: array<string, array{buy: float, sell: float, mid: float}>}|null
     */
    private function parseCbeRegexFallback(string $html, ?string $asOf): ?array
    {
        $rows = [];

        if (preg_match('/US Dollar\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/is', $html, $u)) {
            $buy = (float) $u[1];
            $sell = (float) $u[2];
            if ($buy > 0 && $sell > 0) {
                $rows['USD'] = [
                    'buy' => round($buy, 4),
                    'sell' => round($sell, 4),
                    'mid' => round(($buy + $sell) / 2, 6),
                ];
            }
        }

        if (preg_match('/Euro\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/is', $html, $e)) {
            $buy = (float) $e[1];
            $sell = (float) $e[2];
            if ($buy > 0 && $sell > 0) {
                $rows['EUR'] = [
                    'buy' => round($buy, 4),
                    'sell' => round($sell, 4),
                    'mid' => round(($buy + $sell) / 2, 6),
                ];
            }
        }

        if (($rows['USD'] ?? null) && ($rows['EUR'] ?? null)) {
            return ['as_of' => $asOf, 'rows' => $rows];
        }

        return null;
    }
}
