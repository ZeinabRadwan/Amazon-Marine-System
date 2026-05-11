<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\TreasuryEntry;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Keeps the treasury ledger in sync with operational expenses (single {@see TreasuryEntry} per expense).
 */
class ExpenseTreasurySyncService
{
    public function __construct(
        private TreasuryLedgerBalanceService $ledgerBalance,
    ) {}

    /**
     * Marks the linked treasury row as void when the expense is deleted (ledger row is retained).
     */
    public function voidTreasuryEntryForExpense(Expense $expense): void
    {
        $entry = $this->findEntryForExpense($expense);
        if (! $entry || $entry->is_voided) {
            return;
        }

        $entry->is_voided = true;
        $entry->voided_at = now();
        $note = trim((string) ($entry->notes ?? ''));
        $voidLine = '[VOID] '.__('treasury.expense_deleted');
        $entry->notes = $note === '' ? $voidLine : $note."\n".$voidLine;
        $entry->save();
    }

    /**
     * Creates or updates the treasury “out” leg for this expense.
     * Zero or negative amounts void the row (no hard delete). Restoring a positive amount clears void.
     *
     * @throws ValidationException
     */
    public function syncForExpense(Expense $expense, int $userId): ?TreasuryEntry
    {
        $amount = (float) $expense->amount;
        if ($amount < 0 || ! is_finite($amount)) {
            throw ValidationException::withMessages([
                'amount' => [__('validation.numeric', ['attribute' => 'amount'])],
            ]);
        }

        $existing = $this->findEntryForExpense($expense);

        if ($amount <= 0) {
            if ($existing && ! $existing->is_voided) {
                $existing->is_voided = true;
                $existing->voided_at = now();
                $existing->save();
            }
            $this->syncExpenseTreasuryLink($expense, $existing);

            return $existing;
        }

        $accountId = (int) ($expense->bank_account_id ?? 0);
        if ($accountId <= 0) {
            throw ValidationException::withMessages([
                'bank_account_id' => [__('treasury.bank_account_required_outgoing')],
            ]);
        }

        $currency = strtoupper(trim((string) $expense->currency_code));
        if (strlen($currency) !== 3) {
            throw ValidationException::withMessages([
                'currency_code' => [__('validation.size.string', ['attribute' => 'currency_code', 'size' => 3])],
            ]);
        }

        TreasuryAccountCurrencyService::assertTreasuryEntryCurrencies([
            'entry_type' => 'out',
            'account_id' => $accountId,
            'currency_code' => $currency,
        ]);

        $excludeEntryId = $existing?->id;

        $this->ledgerBalance->ensureDebitDoesNotOverdraft($accountId, $currency, $amount, $excludeEntryId);

        $expense->loadMissing('category');
        $categoryName = trim((string) ($expense->category?->name ?? ''));
        $desc = trim((string) ($expense->description ?? ''));
        $notesParts = array_filter([
            $desc !== '' ? $desc : null,
            $categoryName !== '' ? 'Category: '.$categoryName : null,
        ]);
        $notes = $notesParts !== [] ? implode("\n", $notesParts) : null;

        $journalTxId = $existing?->journal_transaction_id ?? (string) Str::uuid();

        $attributes = [
            'entry_type' => 'out',
            'source' => 'expense',
            'account_id' => $accountId,
            'counter_account_id' => null,
            'payment_id' => null,
            'amount' => $amount,
            'currency_code' => $currency,
            'target_currency_code' => null,
            'exchange_rate' => null,
            'converted_amount' => null,
            'reference' => (string) $expense->id,
            'notes' => $notes,
            'entry_date' => $expense->expense_date,
            'created_by_id' => $userId,
            'journal_transaction_id' => $journalTxId,
            'journal_kind' => TreasuryJournalPostingService::KIND_EXPENSE,
            'ledger_side' => TreasuryJournalPostingService::SIDE_CREDIT,
            'expense_id' => $expense->id,
        ];

        if ($existing) {
            foreach ($attributes as $key => $value) {
                $existing->{$key} = $value;
            }
            $existing->is_voided = false;
            $existing->voided_at = null;
            $existing->save();

            $fresh = $existing->fresh();
            $this->syncExpenseTreasuryLink($expense, $fresh);

            return $fresh;
        }

        $entry = new TreasuryEntry;
        foreach ($attributes as $key => $value) {
            $entry->{$key} = $value;
        }
        $entry->save();

        $fresh = $entry->fresh();
        $this->syncExpenseTreasuryLink($expense, $fresh);

        return $fresh;
    }

    private function findEntryForExpense(Expense $expense): ?TreasuryEntry
    {
        $byExpense = TreasuryEntry::query()->where('expense_id', $expense->id)->first();
        if ($byExpense) {
            return $byExpense;
        }

        $tid = (int) ($expense->treasury_transaction_id ?? 0);

        return $tid > 0 ? TreasuryEntry::query()->find($tid) : null;
    }

    private function syncExpenseTreasuryLink(Expense $expense, ?TreasuryEntry $entry): void
    {
        $tid = $entry?->id;
        $current = $expense->treasury_transaction_id;
        if ((int) ($current ?? 0) === (int) ($tid ?? 0)) {
            return;
        }

        $expense->forceFill(['treasury_transaction_id' => $tid])->saveQuietly();
    }
}
