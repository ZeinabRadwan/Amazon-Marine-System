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
            $key = $entry->source.'|'.$entry->currency_code;
            $amount = (float) $entry->amount;

            if ($entry->entry_type === 'out') {
                $amount = -$amount;
            }

            if (! isset($balancesByAccount[$key])) {
                $balancesByAccount[$key] = 0.0;
            }

            $balancesByAccount[$key] += $amount;
        }

        $cashBalance = 0.0;
        $bankBalance = 0.0;

        foreach ($balancesByAccount as $key => $value) {
            [$account, $currency] = explode('|', $key);

            if (str_starts_with($account, 'cash-')) {
                $cashBalance += $value;
            } else {
                $bankBalance += $value;
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
            $sign = $entry->entry_type === 'out' ? -1 : 1;

            return [
                'id' => $entry->id,
                'entry_date' => $entry->entry_date?->toDateString(),
                'description' => $entry->notes ?? $entry->reference ?? '',
                'entry_type' => $entry->entry_type,
                'amount' => $sign * (float) $entry->amount,
                'currency_code' => $entry->currency_code,
                'source' => $entry->source,
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
            'entry_type' => ['required', 'in:in,out'],
            'source' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3'],
            'description' => ['nullable', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $entry = new TreasuryEntry();
        $entry->entry_type = $validated['entry_type'];
        $entry->source = $validated['source'];
        $entry->amount = $validated['amount'];
        $entry->currency_code = $validated['currency_code'];
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
            'entry_type' => ['sometimes', 'in:in,out'],
            'source' => ['sometimes', 'string', 'max:255'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency_code' => ['sometimes', 'string', 'size:3'],
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
        if (array_key_exists('amount', $validated)) {
            $treasury_entry->amount = $validated['amount'];
        }
        if (array_key_exists('currency_code', $validated)) {
            $treasury_entry->currency_code = $validated['currency_code'];
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

