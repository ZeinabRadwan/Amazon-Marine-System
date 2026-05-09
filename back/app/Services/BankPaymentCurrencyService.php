<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\Currency;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Validates payment currency against {@see BankAccount::$supported_currencies}
 * and applies automatic FX conversion using {@see Currency::$exchange_rate}
 * so treasury ledger amounts match bank-held currencies.
 *
 * Exchange-rate convention: each currency row stores units of the **default**
 * currency equivalent to **one unit** of that currency (default currency row uses 1).
 */
class BankPaymentCurrencyService
{
    /**
     * Mutates $validated in place: sets target_currency_code, exchange_rate, converted_amount when FX applies,
     * or clears them when payment currency is directly supported by the bank account.
     *
     * @param  array<string, mixed>  $validated
     */
    public static function prepareForBank(array &$validated): void
    {
        $accountId = $validated['source_account_id'] ?? $validated['bank_account_id'] ?? null;
        if (! $accountId || ! Schema::hasTable('bank_accounts')) {
            return;
        }

        $bank = BankAccount::query()->find((int) $accountId);
        if (! $bank || ! $bank->is_active) {
            return;
        }

        $supported = $bank->allowedTreasuryCurrencyCodes();

        if ($supported === []) {
            throw ValidationException::withMessages([
                'currency_code' => [__('bank.bank_account_requires_allowed_currencies')],
            ]);
        }

        $payCur = strtoupper(trim((string) ($validated['currency_code'] ?? '')));
        if ($payCur === '' || strlen($payCur) !== 3) {
            return;
        }

        if (in_array($payCur, $supported, true)) {
            $validated['target_currency_code'] = null;
            $validated['exchange_rate'] = null;
            $validated['converted_amount'] = null;

            return;
        }

        $ledgerCur = self::pickLedgerCurrency($supported);
        if (! $ledgerCur) {
            throw ValidationException::withMessages([
                'currency_code' => [__('bank.payment_currency_not_supported')],
            ]);
        }

        $amount = (float) ($validated['amount'] ?? 0);
        if (! is_finite($amount) || $amount <= 0) {
            return;
        }

        try {
            [$converted, $crossRate] = self::convertUsingSystemRates($amount, $payCur, $ledgerCur);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'currency_code' => [__('bank.payment_currency_conversion_failed')],
            ]);
        }

        $validated['target_currency_code'] = $ledgerCur;
        $validated['converted_amount'] = round($converted, 2);
        $validated['exchange_rate'] = round($crossRate, 8);
    }

    /**
     * @param  list<string>  $supported  Uppercase ISO codes
     */
    protected static function pickLedgerCurrency(array $supported): ?string
    {
        if ($supported === []) {
            return null;
        }

        if (! Schema::hasTable('currencies')) {
            return $supported[0];
        }

        $default = Currency::query()
            ->where('is_active', true)
            ->where('is_default', true)
            ->first();

        $defaultCode = $default ? strtoupper(trim((string) $default->code)) : '';
        if ($defaultCode !== '' && in_array($defaultCode, $supported, true)) {
            return $defaultCode;
        }

        sort($supported);

        return $supported[0];
    }

    /**
     * @return array{0: float, 1: float}  [converted_amount, cross_rate from_pay_to_ledger]
     */
    protected static function convertUsingSystemRates(float $amount, string $from, string $to): array
    {
        $from = strtoupper(trim($from));
        $to = strtoupper(trim($to));

        if ($from === $to) {
            return [$amount, 1.0];
        }

        if (! Schema::hasTable('currencies')) {
            throw new \RuntimeException('currencies');
        }

        $fromCur = Currency::query()->whereRaw('UPPER(code) = ?', [$from])->first();
        $toCur = Currency::query()->whereRaw('UPPER(code) = ?', [$to])->first();

        if (! $fromCur || ! $toCur) {
            throw new \RuntimeException('missing_currency_row');
        }

        $perUnitFrom = (float) ($fromCur->exchange_rate ?? 1);
        $perUnitTo = (float) ($toCur->exchange_rate ?? 1);

        if ($perUnitTo <= 0 || ! is_finite($perUnitTo)) {
            throw new \RuntimeException('invalid_rate');
        }

        $valueInDefault = $amount * $perUnitFrom;
        $converted = $valueInDefault / $perUnitTo;
        $crossRate = $amount > 0 ? $converted / $amount : 0.0;

        if (! is_finite($converted) || $converted <= 0) {
            throw new \RuntimeException('invalid_conversion');
        }

        return [$converted, $crossRate];
    }
}
