<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

/**
 * Derives official USD/EUR/EGP cross rates from {@see CbeOfficialExchangeRateService}
 * for treasury transfers/exchanges (AUTO rate mode).
 */
class TreasuryOfficialFxRateService
{
    public function __construct(
        private CbeOfficialExchangeRateService $cbe,
    ) {}

    /**
     * Units of $toCurrency received per one unit of $fromCurrency (multiply leg amount).
     *
     * @throws ValidationException
     */
    public function multiplier(string $fromCurrency, string $toCurrency): float
    {
        $from = strtoupper(trim($fromCurrency));
        $to = strtoupper(trim($toCurrency));

        if ($from === $to) {
            return 1.0;
        }

        $allowed = ['USD', 'EUR', 'EGP'];
        if (! in_array($from, $allowed, true) || ! in_array($to, $allowed, true)) {
            throw ValidationException::withMessages([
                'from_currency' => [__('treasury.fx_auto_only_usd_eur_egp')],
            ]);
        }

        try {
            $data = $this->cbe->fetch();
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'exchange_rate_source' => [__('treasury.fx_auto_unavailable')],
            ]);
        }

        $usdMid = (float) ($data['usd']['mid'] ?? 0);
        $eurMid = (float) ($data['eur']['mid'] ?? 0);

        if ($usdMid <= 0 || $eurMid <= 0 || ! is_finite($usdMid) || ! is_finite($eurMid)) {
            throw ValidationException::withMessages([
                'exchange_rate_source' => [__('treasury.fx_auto_unavailable')],
            ]);
        }

        $egpPerUnit = static function (string $code) use ($usdMid, $eurMid): float {
            return match ($code) {
                'EGP' => 1.0,
                'USD' => $usdMid,
                'EUR' => $eurMid,
                default => 0.0,
            };
        };

        $fromEgp = $egpPerUnit($from);
        $toEgp = $egpPerUnit($to);

        if ($fromEgp <= 0 || $toEgp <= 0) {
            throw ValidationException::withMessages([
                'exchange_rate_source' => [__('treasury.fx_auto_unavailable')],
            ]);
        }

        $mult = $fromEgp / $toEgp;

        if (! is_finite($mult) || $mult <= 0) {
            throw ValidationException::withMessages([
                'exchange_rate_source' => [__('treasury.fx_auto_unavailable')],
            ]);
        }

        return $mult;
    }
}
