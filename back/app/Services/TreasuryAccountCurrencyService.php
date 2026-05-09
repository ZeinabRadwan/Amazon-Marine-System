<?php

namespace App\Services;

use App\Models\BankAccount;
use Illuminate\Validation\ValidationException;

/**
 * Enforces allowed treasury ledger currencies per {@see BankAccount}
 * (banks vs operational cash wallets).
 */
class TreasuryAccountCurrencyService
{
    /**
     * @throws ValidationException
     */
    public static function assertCurrencyAllowedForAccount(?int $accountId, string $currencyCode): void
    {
        if ($accountId === null || $accountId <= 0) {
            return;
        }

        $cur = strtoupper(trim($currencyCode));
        if ($cur === '' || strlen($cur) !== 3) {
            return;
        }

        $bank = BankAccount::query()->find($accountId);
        if (! $bank || ! $bank->is_active) {
            return;
        }

        $allowed = $bank->allowedTreasuryCurrencyCodes();
        if ($allowed === []) {
            throw ValidationException::withMessages([
                'currency_code' => [__('treasury.account_has_no_allowed_currencies')],
            ]);
        }

        if (! in_array($cur, $allowed, true)) {
            throw ValidationException::withMessages([
                'currency_code' => [__('treasury.currency_not_allowed_for_account', ['currency' => $cur])],
            ]);
        }
    }

    /**
     * Validates currencies on treasury manual entries (API payloads).
     *
     * @param  array<string, mixed>  $validated
     *
     * @throws ValidationException
     */
    public static function assertTreasuryEntryCurrencies(array $validated): void
    {
        $entryType = strtolower(trim((string) ($validated['entry_type'] ?? '')));
        $currency = strtoupper(trim((string) ($validated['currency_code'] ?? '')));
        $targetCurrency = strtoupper(trim((string) ($validated['target_currency_code'] ?? '')));
        $accountId = isset($validated['account_id']) ? (int) $validated['account_id'] : 0;
        $counterId = isset($validated['counter_account_id']) ? (int) $validated['counter_account_id'] : 0;

        if ($currency !== '' && strlen($currency) === 3) {
            if (in_array($entryType, ['in', 'out', 'transfer', 'exchange'], true)) {
                if ($accountId > 0) {
                    self::assertCurrencyAllowedForAccount($accountId, $currency);
                }
            }
        }

        $counterLegCurrency = $targetCurrency !== '' && strlen($targetCurrency) === 3
            ? $targetCurrency
            : (in_array($entryType, ['transfer', 'exchange'], true) ? $currency : '');
        if (
            $counterLegCurrency !== ''
            && strlen($counterLegCurrency) === 3
            && in_array($entryType, ['transfer', 'exchange'], true)
            && $counterId > 0
        ) {
            self::assertCurrencyAllowedForAccount($counterId, $counterLegCurrency);
        }
    }

    /**
     * @throws ValidationException
     */
    public static function assertTransferCurrencies(
        int $fromAccountId,
        int $toAccountId,
        string $fromCurrency,
        string $toCurrency,
    ): void {
        $fc = strtoupper(trim($fromCurrency));
        $tc = strtoupper(trim($toCurrency));

        if ($fromAccountId > 0 && $fc !== '' && strlen($fc) === 3) {
            self::assertCurrencyAllowedForAccount($fromAccountId, $fc);
        }

        if ($toAccountId > 0 && $tc !== '' && strlen($tc) === 3) {
            self::assertCurrencyAllowedForAccount($toAccountId, $tc);
        }
    }
}
