<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\BankAccount;
use App\Models\TreasuryEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TreasuryController extends Controller
{
    private function normalizeCurrency(string $code): string
    {
        $c = strtoupper(trim($code));
        return $c !== '' ? $c : 'USD';
    }

    /**
     * @param array<string, array<string, float>> $balances
     */
    private function applyEntryToBalances(array &$balances, TreasuryEntry $entry): void
    {
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
                // out / transfer / exchange reduce source side
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

    public function summary(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view treasury summary.')
        );

        $months = max(1, (int) $request->query('months', 6));
        $from = now()->subMonths($months - 1)->startOfMonth();

        $entries = TreasuryEntry::query()
            ->whereDate('entry_date', '>=', $from)
            ->get();

        $byCurrency = $entries->groupBy('currency_code');

        $balancesByAccount = [];
        foreach ($entries as $entry) {
            $this->applyEntryToBalances($balancesByAccount, $entry);
        }

        $cashBalance = 0.0;
        $bankBalance = 0.0;
        $bankBalances = [];
        $bankAccounts = BankAccount::query()->get()->keyBy('id');
        foreach ($balancesByAccount as $accountId => $currencyMap) {
            foreach ($currencyMap as $currency => $value) {
                if (is_numeric($accountId) && isset($bankAccounts[(int) $accountId])) {
                    $bankBalance += (float) $value;
                    $bank = $bankAccounts[(int) $accountId];
                    $bankBalances[] = [
                        'account_id' => $bank->id,
                        'bank_name' => $bank->bank_name,
                        'account_name' => $bank->account_name,
                        'account_number' => $bank->account_number,
                        'currency_code' => $currency,
                        'balance' => (float) $value,
                    ];
                } else {
                    $cashBalance += (float) $value;
                }
            }
        }

        $monthsCursor = $from->copy();
        $labels = [];
        $inboundSeries = [];
        $outboundSeries = [];
        $balanceSeries = [];
        $runningBalance = 0.0;

        while ($monthsCursor <= now()) {
            $monthKey = $monthsCursor->format('Y-m');

            $monthEntries = $entries->filter(function (TreasuryEntry $entry) use ($monthKey) {
                return $entry->entry_date?->format('Y-m') === $monthKey;
            });

            $in = (float) $monthEntries->where('entry_type', 'in')->sum('amount');
            $out = (float) $monthEntries->where('entry_type', 'out')->sum('amount');

            $runningBalance += $in - $out;

            $labels[] = $monthKey;
            $inboundSeries[] = $in;
            $outboundSeries[] = $out;
            $balanceSeries[] = $runningBalance;

            $monthsCursor->addMonth();
        }

        $monthStart = now()->copy()->startOfMonth();

        $monthlyExpenses = Expense::query()
            ->whereDate('expense_date', '>=', $monthStart)
            ->sum('amount');

        return response()->json([
            'data' => [
                'totals' => [
                    'cash_balance' => $cashBalance,
                    'bank_balance' => $bankBalance,
                    'monthly_expenses' => (float) $monthlyExpenses,
                ],
                'bank_balances' => $bankBalances,
                'cash_flow' => [
                    'labels' => $labels,
                    'inbound' => $inboundSeries,
                    'outbound' => $outboundSeries,
                ],
                'balance' => [
                    'labels' => $labels,
                    'balance' => $balanceSeries,
                ],
            ],
        ]);
    }

    public function entries(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view treasury entries.')
        );

        $query = TreasuryEntry::query();

        if ($type = $request->query('type')) {
            $query->where('entry_type', $type);
        }
        if ($account = $request->query('account')) {
            $query->where('source', $account);
        }
        if ($currency = $request->query('currency')) {
            $query->where('currency_code', strtoupper((string) $currency));
        }

        if ($from = $request->query('from')) {
            $query->whereDate('entry_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('entry_date', '<=', $to);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('reference', 'like', '%'.$search.'%')
                    ->orWhere('notes', 'like', '%'.$search.'%');
            });
        }

        $sort = $request->query('sort', 'date');

        if ($sort === 'amount') {
            $query->orderByDesc('amount');
        } else {
            $query->orderByDesc('entry_date');
        }

        $entries = $query->get();

        $rows = $entries->map(static function (TreasuryEntry $entry): array {
            $type = strtolower((string) $entry->entry_type);
            $sign = in_array($type, ['out', 'transfer', 'exchange'], true) ? -1 : 1;

            return [
                'id' => $entry->id,
                'entry_date' => $entry->entry_date?->toDateString(),
                'description' => $entry->notes ?? $entry->reference ?? '',
                'entry_type' => $entry->entry_type,
                'amount' => $sign * (float) $entry->amount,
                'currency_code' => $entry->currency_code,
                'source' => $entry->source,
                'account_id' => $entry->account_id,
                'counter_account_id' => $entry->counter_account_id,
                'payment_id' => $entry->payment_id,
                'target_currency_code' => $entry->target_currency_code,
                'exchange_rate' => $entry->exchange_rate,
                'converted_amount' => $entry->converted_amount,
            ];
        });

        return response()->json([
            'data' => $rows,
        ]);
    }

    public function expenses(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view expenses.')
        );

        $query = Expense::query()->with('category');

        if ($categoryId = $request->query('category_id')) {
            $query->where('expense_category_id', $categoryId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('expense_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('expense_date', '<=', $to);
        }

        if ($search = $request->query('search')) {
            $query->where('description', 'like', '%'.$search.'%');
        }

        $sort = $request->query('sort', 'date');

        if ($sort === 'amount') {
            $query->orderByDesc('amount');
        } else {
            $query->orderByDesc('expense_date');
        }

        $expenses = $query->get();

        $rows = $expenses->map(static function (Expense $expense): array {
            return [
                'id' => $expense->id,
                'expense_date' => $expense->expense_date?->toDateString(),
                'description' => $expense->description,
                'category_name' => $expense->category?->name ?? '',
                'amount' => (float) $expense->amount,
                'currency_code' => $expense->currency_code,
            ];
        });

        return response()->json([
            'data' => $rows,
        ]);
    }

    public function storeEntry(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to create treasury entries.')
        );

        $validated = $request->validate([
            'entry_type' => ['required', 'in:in,out,transfer,exchange'],
            'source' => ['nullable', 'string', 'max:255'],
            'account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'counter_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3'],
            'target_currency_code' => ['nullable', 'string', 'size:3'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'converted_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_id' => ['nullable', 'integer', 'exists:payments,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $entry = new TreasuryEntry();
        $entry->entry_type = $validated['entry_type'];
        $entry->source = $validated['source'] ?? null;
        $entry->account_id = $validated['account_id'] ?? null;
        $entry->counter_account_id = $validated['counter_account_id'] ?? null;
        $entry->amount = $validated['amount'];
        $entry->currency_code = $validated['currency_code'];
        $entry->target_currency_code = $validated['target_currency_code'] ?? null;
        $entry->exchange_rate = $validated['exchange_rate'] ?? null;
        $entry->converted_amount = $validated['converted_amount'] ?? null;
        $entry->payment_id = $validated['payment_id'] ?? null;
        $entry->reference = $validated['description'] ?? null;
        $entry->notes = $validated['notes'] ?? null;
        $entry->entry_date = $validated['entry_date'];
        $entry->created_by_id = $request->user()->id;
        $entry->save();

        return response()->json([
            'data' => $entry,
        ], 201);
    }

    public function updateEntry(Request $request, TreasuryEntry $treasury_entry): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to update treasury entries.')
        );

        $validated = $request->validate([
            'entry_type' => ['sometimes', 'in:in,out,transfer,exchange'],
            'source' => ['nullable', 'string', 'max:255'],
            'account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'counter_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency_code' => ['sometimes', 'string', 'size:3'],
            'target_currency_code' => ['nullable', 'string', 'size:3'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'converted_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_id' => ['nullable', 'integer', 'exists:payments,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['sometimes', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        if (array_key_exists('entry_type', $validated)) {
            $treasury_entry->entry_type = $validated['entry_type'];
        }
        if (array_key_exists('source', $validated)) {
            $treasury_entry->source = $validated['source'];
        }
        if (array_key_exists('account_id', $validated)) {
            $treasury_entry->account_id = $validated['account_id'];
        }
        if (array_key_exists('counter_account_id', $validated)) {
            $treasury_entry->counter_account_id = $validated['counter_account_id'];
        }
        if (array_key_exists('amount', $validated)) {
            $treasury_entry->amount = $validated['amount'];
        }
        if (array_key_exists('currency_code', $validated)) {
            $treasury_entry->currency_code = $validated['currency_code'];
        }
        if (array_key_exists('target_currency_code', $validated)) {
            $treasury_entry->target_currency_code = $validated['target_currency_code'];
        }
        if (array_key_exists('exchange_rate', $validated)) {
            $treasury_entry->exchange_rate = $validated['exchange_rate'];
        }
        if (array_key_exists('converted_amount', $validated)) {
            $treasury_entry->converted_amount = $validated['converted_amount'];
        }
        if (array_key_exists('payment_id', $validated)) {
            $treasury_entry->payment_id = $validated['payment_id'];
        }
        if (array_key_exists('description', $validated)) {
            $treasury_entry->reference = $validated['description'];
        }
        if (array_key_exists('entry_date', $validated)) {
            $treasury_entry->entry_date = $validated['entry_date'];
        }
        if (array_key_exists('notes', $validated)) {
            $treasury_entry->notes = $validated['notes'];
        }

        $treasury_entry->save();

        return response()->json([
            'data' => $treasury_entry,
        ]);
    }

    public function destroyEntry(Request $request, TreasuryEntry $treasury_entry): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to delete treasury entries.')
        );

        $treasury_entry->delete();

        return response()->json([
            'message' => __('Treasury entry deleted.'),
        ]);
    }

    public function storeTransfer(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to create transfers.')
        );

        $validated = $request->validate([
            'from_account' => ['required', 'string', 'max:255'],
            'to_account' => ['required', 'string', 'max:255', 'different:from_account'],
            'from_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'to_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id', 'different:from_account_id'],
            'from_amount' => ['required', 'numeric', 'min:0'],
            'from_currency' => ['required', 'string', 'size:3'],
            'to_amount' => ['nullable', 'numeric', 'min:0'],
            'to_currency' => ['nullable', 'string', 'size:3'],
            'fx_rate' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
        ]);

        $userId = $request->user()->id;
        $fromCurrency = strtoupper($validated['from_currency']);
        $toCurrency = strtoupper((string) ($validated['to_currency'] ?? $fromCurrency));

        if ($fromCurrency !== $toCurrency && empty($validated['fx_rate'])) {
            return response()->json([
                'message' => __('Manual exchange rate is required for cross-currency transfers.'),
            ], 422);
        }

        $fxRate = isset($validated['fx_rate']) ? (float) $validated['fx_rate'] : null;
        $toAmount = isset($validated['to_amount'])
            ? (float) $validated['to_amount']
            : ($fxRate && $fromCurrency !== $toCurrency
                ? ((float) $validated['from_amount'] * $fxRate)
                : (float) $validated['from_amount']);

        DB::transaction(function () use ($validated, $userId, $fromCurrency, $toCurrency, $fxRate, $toAmount): void {
            $from = new TreasuryEntry();
            $from->entry_type = 'out';
            $from->source = $validated['from_account'];
            $from->account_id = $validated['from_account_id'] ?? null;
            $from->counter_account_id = $validated['to_account_id'] ?? null;
            $from->amount = $validated['from_amount'];
            $from->currency_code = $fromCurrency;
            $from->target_currency_code = $toCurrency;
            $from->exchange_rate = $fxRate;
            $from->converted_amount = $toAmount;
            $from->reference = $validated['description'] ?? null;
            $from->entry_date = $validated['entry_date'];
            $from->created_by_id = $userId;
            $from->save();

            $to = new TreasuryEntry();
            $to->entry_type = 'in';
            $to->source = $validated['to_account'];
            $to->account_id = $validated['to_account_id'] ?? null;
            $to->counter_account_id = $validated['from_account_id'] ?? null;
            $to->amount = $toAmount;
            $to->currency_code = $toCurrency;
            $to->target_currency_code = $fromCurrency;
            $to->exchange_rate = $fxRate;
            $to->converted_amount = (float) $validated['from_amount'];
            $to->reference = $validated['description'] ?? null;
            $to->entry_date = $validated['entry_date'];
            $to->created_by_id = $userId;
            $to->save();
        });

        return response()->json([
            'message' => __('Transfer recorded.'),
        ], 201);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            __('You do not have permission to create expenses.')
        );

        $validated = $request->validate([
            'expense_category_id' => ['required', 'integer', 'exists:expense_categories,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3'],
            'expense_date' => ['required', 'date'],
        ]);

        $expense = new Expense();
        $expense->expense_category_id = $validated['expense_category_id'];
        $expense->description = $validated['description'];
        $expense->amount = $validated['amount'];
        $expense->currency_code = $validated['currency_code'];
        $expense->expense_date = $validated['expense_date'];
        $expense->paid_by_id = $request->user()->id;
        $expense->save();

        return response()->json([
            'data' => $expense->load('category'),
        ], 201);
    }
}

