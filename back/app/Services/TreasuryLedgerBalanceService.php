<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\TreasuryEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

/**
 * Raw treasury ledger balances per bank account (negative allowed in computation).
 * Used to block outgoing movements that would overdraft a currency bucket.
 */
class TreasuryLedgerBalanceService
{
    public function normalizeCurrency(string $code): string
    {
        $c = strtoupper(trim($code));

        return $c !== '' ? $c : 'USD';
    }

    /**
     * @param  array<string, array<string, float>>  $balances
     */
    private function applyEntryToBalances(array &$balances, TreasuryEntry $entry): void
    {
        if ((bool) ($entry->is_voided ?? false)) {
            return;
        }

        $type = strtolower((string) $entry->entry_type);
        $amount = (float) $entry->amount;
        $currency = $this->normalizeCurrency((string) $entry->currency_code);
        $targetCurrency = $this->normalizeCurrency((string) ($entry->target_currency_code ?: $currency));
        $converted = (float) ($entry->converted_amount ?? 0);

        if ($entry->account_id) {
            $accountId = (string) $entry->account_id;
            $balances[$accountId] ??= [];
            $balances[$accountId][$currency] = (float) ($balances[$accountId][$currency] ?? 0);

            if ($type === 'in') {
                $balances[$accountId][$currency] += $amount;
            } else {
                $balances[$accountId][$currency] -= $amount;
            }
        }

        if ($entry->counter_account_id) {
            $counterId = (string) $entry->counter_account_id;
            $balances[$counterId] ??= [];
            $creditAmount = $converted > 0 ? $converted : $amount;
            $creditCurrency = $targetCurrency ?: $currency;
            $balances[$counterId][$creditCurrency] = (float) ($balances[$counterId][$creditCurrency] ?? 0) + $creditAmount;
        }
    }

    /**
     * Raw ledger balances per bank account and currency (negative allowed).
     *
     * @return array<string, array<string, float>>
     */
    public function computeRawBalancesByAccount(?int $excludeEntryId = null): array
    {
        $query = TreasuryEntry::query()->orderBy('entry_date')->orderBy('id');
        if ($excludeEntryId) {
            $query->where('id', '!=', $excludeEntryId);
        }

        $balancesByAccount = [];
        foreach ($query->get() as $entry) {
            $this->applyEntryToBalances($balancesByAccount, $entry);
        }

        return $balancesByAccount;
    }

    /**
     * Compute balances from an arbitrary entry set (e.g. date-filtered), not the full ledger.
     *
     * @param  iterable<TreasuryEntry>  $entries
     * @return array<string, array<string, float>>
     */
    public function computeRawBalancesFromEntries(iterable $entries): array
    {
        $balancesByAccount = [];
        foreach ($entries as $entry) {
            $this->applyEntryToBalances($balancesByAccount, $entry);
        }

        return $balancesByAccount;
    }

    /**
     * @param  array<string, array<string, float>>  $balancesByAccount
     */
    public function getRawBalanceForBankCurrency(array $balancesByAccount, int $bankId, string $currency): float
    {
        $key = (string) $bankId;
        $cur = $this->normalizeCurrency($currency);

        return (float) ($balancesByAccount[$key][$cur] ?? 0);
    }

    /**
     * @throws ValidationException
     */
    public function ensureDebitDoesNotOverdraft(int $accountId, string $currency, float $amount, ?int $excludeEntryId = null): void
    {
        if ($accountId <= 0 || $amount <= 0 || ! is_finite($amount)) {
            return;
        }

        $balances = $this->computeRawBalancesByAccount($excludeEntryId);
        $avail = $this->getRawBalanceForBankCurrency($balances, $accountId, $currency);

        if ($avail + 1e-6 < $amount) {
            throw ValidationException::withMessages([
                'amount' => [__('bank.insufficient_balance_currency')],
            ]);
        }
    }

    /**
     * Same rules as legacy TreasuryController::assertSufficientBankBalance — returns 422 JSON or null.
     *
     * @param  array<string, mixed>  $validated
     */
    public function assertSufficientBankBalanceForEntryPayload(array $validated, ?int $excludeEntryId = null): ?JsonResponse
    {
        $accountId = isset($validated['account_id']) ? (int) $validated['account_id'] : 0;

        $type = strtolower((string) ($validated['entry_type'] ?? ''));
        if (! in_array($type, ['out', 'transfer', 'exchange'], true)) {
            return null;
        }

        if ($accountId <= 0) {
            return response()->json([
                'message' => __('treasury.bank_account_required_outgoing'),
            ], 422);
        }

        $amount = (float) ($validated['amount'] ?? 0);
        if ($amount <= 0 || ! is_finite($amount)) {
            return null;
        }

        $currency = $this->normalizeCurrency((string) ($validated['currency_code'] ?? 'USD'));

        try {
            $this->ensureDebitDoesNotOverdraft($accountId, $currency, $amount, $excludeEntryId);
        } catch (ValidationException $e) {
            $msg = collect($e->errors())->flatten()->first() ?? __('bank.insufficient_balance_currency');

            return response()->json([
                'message' => $msg,
                'errors' => $e->errors(),
            ], 422);
        }

        return null;
    }

    /**
     * Before posting a vendor payment treasury debit: ensure source bank has funds
     * (same amounts/currencies as {@see FinancialService::handlePaymentPosted}).
     *
     * @throws ValidationException
     */
    public function ensureVendorPaymentBankDebitAllowed(Payment $payment): void
    {
        if ($payment->type !== 'vendor_payment') {
            return;
        }

        $accountId = (int) ($payment->source_account_id ?? 0);
        if ($accountId <= 0) {
            return;
        }

        $ledgerCurrency = strtoupper(trim((string) ($payment->target_currency_code ?? '')));
        $payCurrency = strtoupper(trim((string) ($payment->currency_code ?? '')));
        $hasFx = $payment->converted_amount !== null
            && (float) $payment->converted_amount > 0
            && $ledgerCurrency !== ''
            && $ledgerCurrency !== $payCurrency;

        if ($hasFx) {
            $ledgerAmount = (float) $payment->converted_amount;
            if ($ledgerAmount <= 0 || ! is_finite($ledgerAmount)) {
                return;
            }
            $this->ensureDebitDoesNotOverdraft($accountId, $ledgerCurrency, $ledgerAmount, null);

            return;
        }

        $cur = $payCurrency !== '' ? $payCurrency : $this->normalizeCurrency((string) $payment->currency_code);
        $amt = (float) $payment->amount;
        if ($amt <= 0 || ! is_finite($amt)) {
            return;
        }

        $this->ensureDebitDoesNotOverdraft($accountId, $cur, $amt, null);
    }
}
