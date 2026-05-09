<?php

namespace App\Services;

use App\Models\TreasuryEntry;
use Illuminate\Support\Str;

/**
 * Unified double-entry rules for treasury ledger rows stored in {@see TreasuryEntry}.
 *
 * Every paired movement (transfer / FX) generates exactly two rows sharing {@see TreasuryEntry::$journal_transaction_id}:
 * - Credit leg ({@see self::SIDE_CREDIT}): outgoing from the source account (`entry_type` out).
 * - Debit leg ({@see self::SIDE_DEBIT}): incoming to the destination account (`entry_type` in).
 *
 * FX: both legs carry the same {@see TreasuryEntry::$exchange_rate}, {@see TreasuryEntry::$exchange_rate_source},
 * primary {@see TreasuryEntry::$amount}/{@see TreasuryEntry::$currency_code}, and mirrored {@see TreasuryEntry::$converted_amount}/{@see TreasuryEntry::$target_currency_code}.
 */
class TreasuryJournalPostingService
{
    public const KIND_INTERNAL_TRANSFER = 'internal_transfer';

    public const KIND_CURRENCY_EXCHANGE = 'currency_exchange';

    /** Single-leg flows (e.g. payment sync) — bank leg only; contra may live on invoices/bills. */
    public const KIND_PAYMENT = 'payment';

    /** UI / manual treasury rows */
    public const KIND_MANUAL = 'manual';

    /** Incoming (to account balance): maps to `entry_type` in */
    public const SIDE_DEBIT = 'debit';

    /** Outgoing (from account balance): maps to `entry_type` out */
    public const SIDE_CREDIT = 'credit';

    /**
     * Post a transfer or currency exchange as a balanced journal pair.
     *
     * @param  array<string, mixed>  $validated  Validated storeTransfer payload
     * @return array{0: TreasuryEntry, 1: TreasuryEntry} credit leg (source out), debit leg (destination in)
     */
    public function postTransferPair(
        array $validated,
        string $fromCurrency,
        string $toCurrency,
        ?float $fxRate,
        float $toAmount,
        ?string $exchangeRateSource,
        int $userId,
    ): array {
        $journalTransactionId = (string) Str::uuid();
        $journalKind = $fromCurrency !== $toCurrency
            ? self::KIND_CURRENCY_EXCHANGE
            : self::KIND_INTERNAL_TRANSFER;

        $fromAmount = (float) $validated['from_amount'];

        $credit = new TreasuryEntry;
        $credit->entry_type = 'out';
        $credit->ledger_side = self::SIDE_CREDIT;
        $credit->journal_kind = $journalKind;
        $credit->journal_transaction_id = $journalTransactionId;
        $credit->source = $validated['from_account'];
        $credit->account_id = $validated['from_account_id'] ?? null;
        $credit->counter_account_id = $validated['to_account_id'] ?? null;
        $credit->amount = $fromAmount;
        $credit->currency_code = $fromCurrency;
        $credit->target_currency_code = $toCurrency;
        $credit->exchange_rate = $fxRate;
        $credit->exchange_rate_source = $exchangeRateSource;
        $credit->converted_amount = $toAmount;
        $credit->reference = $validated['description'] ?? null;
        $credit->entry_date = $validated['entry_date'];
        $credit->created_by_id = $userId;
        $credit->save();

        $debit = new TreasuryEntry;
        $debit->entry_type = 'in';
        $debit->ledger_side = self::SIDE_DEBIT;
        $debit->journal_kind = $journalKind;
        $debit->journal_transaction_id = $journalTransactionId;
        $debit->source = $validated['to_account'];
        $debit->account_id = $validated['to_account_id'] ?? null;
        $debit->counter_account_id = $validated['from_account_id'] ?? null;
        $debit->amount = $toAmount;
        $debit->currency_code = $toCurrency;
        $debit->target_currency_code = $fromCurrency;
        $debit->exchange_rate = $fxRate;
        $debit->exchange_rate_source = $exchangeRateSource;
        $debit->converted_amount = $fromAmount;
        $debit->reference = $validated['description'] ?? null;
        $debit->entry_date = $validated['entry_date'];
        $debit->created_by_id = $userId;
        $debit->save();

        return [$credit, $debit];
    }
}
