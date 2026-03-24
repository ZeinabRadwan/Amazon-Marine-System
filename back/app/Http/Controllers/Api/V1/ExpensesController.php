<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExpenseRequest;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpensesController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            'You do not have permission to view expenses summary.'
        );

        $months = max(1, (int) $request->query('months', 6));
        $from = now()->subMonths($months - 1)->startOfMonth();
        $monthStart = now()->copy()->startOfMonth();

        $allExpenses = Expense::query()
            ->whereDate('expense_date', '>=', $from)
            ->get();

        $thisMonthAll = $allExpenses->filter(function (Expense $e) use ($monthStart) {
            return $e->expense_date && $e->expense_date->gte($monthStart);
        });

        $totalMonth = (float) $thisMonthAll->sum('amount');
        $shipmentMonth = (float) $thisMonthAll->whereNotNull('shipment_id')->sum('amount');
        $generalMonth = (float) $thisMonthAll->whereNull('shipment_id')->sum('amount');

        $invoiceRevenue = (float) Invoice::query()
            ->whereDate('issue_date', '>=', $monthStart)
            ->sum('total_amount');

        $netProfit = $invoiceRevenue - $totalMonth;

        $labels = [];
        $monthlyTotals = [];
        $monthsCursor = $from->copy();

        while ($monthsCursor <= now()) {
            $key = $monthsCursor->format('Y-m');
            $monthExpenses = $allExpenses->filter(function (Expense $e) use ($key) {
                return $e->expense_date?->format('Y-m') === $key;
            });
            $labels[] = $key;
            $monthlyTotals[] = (float) $monthExpenses->sum('amount');
            $monthsCursor->addMonth();
        }

        $byCategory = $allExpenses->groupBy('expense_category_id')->map(function ($group, $catId) {
            $category = ExpenseCategory::find($catId);

            return [
                'label' => $category?->name ?? 'Other',
                'total' => (float) $group->sum('amount'),
            ];
        })->values();

        return response()->json([
            'data' => [
                'cards' => [
                    'total_month' => $totalMonth,
                    'shipment_month' => $shipmentMonth,
                    'general_month' => $generalMonth,
                    'net_profit' => $netProfit,
                ],
                'monthly' => [
                    'labels' => $labels,
                    'totals' => $monthlyTotals,
                ],
                'by_category' => $byCategory,
            ],
        ]);
    }

    public function shipmentIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->hasRole('admin') || $user->can('accounting.view')),
            403,
            'You do not have permission to view shipment expenses.'
        );

        $query = Expense::query()
            ->whereNotNull('shipment_id')
            ->with(['category', 'vendor', 'shipment']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('description', 'like', '%'.$search.'%')
                    ->orWhere('invoice_number', 'like', '%'.$search.'%');
            });
        }

        if ($bl = $request->query('bl')) {
            $query->whereHas('shipment', function ($q) use ($bl): void {
                $q->where('bl_number', 'like', '%'.$bl.'%');
            });
        }

        if ($category = $request->query('category')) {
            if (is_numeric($category)) {
                $query->where('expense_category_id', $category);
            } else {
                $query->whereHas('category', function ($q) use ($category): void {
                    $q->where('name', 'like', '%'.$category.'%');
                });
            }
        }

        if ($currency = $request->query('currency')) {
            $query->where('currency_code', $currency);
        }

        if ($month = $request->query('month')) {
            $parts = explode('-', $month);
            if (count($parts) === 2) {
                $query->whereYear('expense_date', (int) $parts[0])->whereMonth('expense_date', (int) $parts[1]);
            }
        }

        $sort = $request->query('sort', 'date');
        if ($sort === 'amount') {
            $query->orderByDesc('amount');
        } else {
            $query->orderByDesc('expense_date');
        }

        $expenses = $query->get();

        if ($sort === 'category') {
            $expenses = $expenses->sortBy(fn (Expense $e) => $e->category?->name ?? '')->values();
        } elseif ($sort === 'bl') {
            $expenses = $expenses->sortBy(fn (Expense $e) => $e->shipment?->bl_number ?? '')->values();
        }

        $rows = $expenses->map(function (Expense $expense): array {
            return [
                'id' => $expense->id,
                'bl_number' => $expense->shipment?->bl_number ?? '',
                'category_name' => $expense->category?->name ?? '',
                'description' => $expense->description,
                'amount' => (float) $expense->amount,
                'currency_code' => $expense->currency_code,
                'vendor_name' => $expense->vendor?->name ?? '',
                'expense_date' => $expense->expense_date?->toDateString(),
                'invoice_number' => $expense->invoice_number,
                'has_receipt' => (bool) $expense->has_receipt,
            ];
        })->values();

        return response()->json(['data' => $rows]);
    }

    public function generalIndex(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            'You do not have permission to view general expenses.'
        );

        $query = Expense::query()
            ->whereNull('shipment_id')
            ->with('category');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('description', 'like', '%'.$search.'%')
                    ->orWhere('invoice_number', 'like', '%'.$search.'%');
            });
        }

        if ($category = $request->query('category')) {
            if (is_numeric($category)) {
                $query->where('expense_category_id', $category);
            } else {
                $query->whereHas('category', function ($q) use ($category): void {
                    $q->where('name', 'like', '%'.$category.'%');
                });
            }
        }

        if ($currency = $request->query('currency')) {
            $query->where('currency_code', $currency);
        }

        if ($month = $request->query('month')) {
            $parts = explode('-', $month);
            if (count($parts) === 2) {
                $query->whereYear('expense_date', (int) $parts[0])->whereMonth('expense_date', (int) $parts[1]);
            }
        }

        $sort = $request->query('sort', 'date');
        if ($sort === 'amount') {
            $query->orderByDesc('amount');
        } else {
            $query->orderByDesc('expense_date');
        }

        $expenses = $query->get();

        if ($sort === 'category') {
            $expenses = $expenses->sortBy(fn (Expense $e) => $e->category?->name ?? '')->values();
        }

        $rows = $expenses->map(function (Expense $expense): array {
            return [
                'id' => $expense->id,
                'category_name' => $expense->category?->name ?? '',
                'description' => $expense->description,
                'amount' => (float) $expense->amount,
                'currency_code' => $expense->currency_code,
                'payment_method' => $expense->payment_method,
                'expense_date' => $expense->expense_date?->toDateString(),
                'has_receipt' => (bool) $expense->has_receipt,
            ];
        })->values();

        return response()->json(['data' => $rows]);
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $expense = new Expense();
        $expense->expense_category_id = $validated['expense_category_id'];
        $expense->description = $validated['description'];
        $expense->amount = $validated['amount'];
        $expense->currency_code = $validated['currency_code'];
        $expense->expense_date = $validated['expense_date'];
        $expense->paid_by_id = $request->user()->id;
        $expense->payment_method = $validated['payment_method'] ?? null;
        $expense->invoice_number = $validated['invoice_number'] ?? null;
        $expense->vendor_id = $validated['vendor_id'] ?? null;

        if (($validated['type'] ?? '') === 'shipment') {
            $expense->shipment_id = $validated['shipment_id'] ?? null;
        } else {
            $expense->shipment_id = null;
        }

        $expense->save();

        return response()->json([
            'data' => $expense->load(['category', 'vendor', 'shipment']),
        ], 201);
    }

    public function show(Request $request, Expense $expense): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            'You do not have permission to view this expense.'
        );

        return response()->json([
            'data' => $expense->load(['category', 'vendor', 'shipment']),
        ]);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            'You do not have permission to update expenses.'
        );

        $validated = $request->validate([
            'expense_category_id' => ['sometimes', 'integer', 'exists:expense_categories,id'],
            'description' => ['sometimes', 'string', 'max:500'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency_code' => ['sometimes', 'string', 'size:3'],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'expense_date' => ['sometimes', 'date'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'type' => ['sometimes', 'in:shipment,general'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
        ]);

        if (array_key_exists('expense_category_id', $validated)) {
            $expense->expense_category_id = $validated['expense_category_id'];
        }
        if (array_key_exists('description', $validated)) {
            $expense->description = $validated['description'];
        }
        if (array_key_exists('amount', $validated)) {
            $expense->amount = $validated['amount'];
        }
        if (array_key_exists('currency_code', $validated)) {
            $expense->currency_code = $validated['currency_code'];
        }
        if (array_key_exists('payment_method', $validated)) {
            $expense->payment_method = $validated['payment_method'];
        }
        if (array_key_exists('expense_date', $validated)) {
            $expense->expense_date = $validated['expense_date'];
        }
        if (array_key_exists('invoice_number', $validated)) {
            $expense->invoice_number = $validated['invoice_number'];
        }
        if (array_key_exists('vendor_id', $validated)) {
            $expense->vendor_id = $validated['vendor_id'];
        }
        if (isset($validated['type'])) {
            $expense->shipment_id = ($validated['type'] === 'shipment' && ! empty($validated['shipment_id']))
                ? $validated['shipment_id']
                : null;
        } elseif (array_key_exists('shipment_id', $validated)) {
            $expense->shipment_id = $validated['shipment_id'];
        }

        $expense->save();

        return response()->json([
            'data' => $expense->fresh(['category', 'vendor', 'shipment']),
        ]);
    }

    public function destroy(Request $request, Expense $expense): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            'You do not have permission to delete expenses.'
        );

        $expense->delete();

        return response()->json([
            'message' => 'Expense deleted.',
        ]);
    }

    public function uploadReceipt(Request $request, Expense $expense): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.manage'),
            403,
            'You do not have permission to upload expense receipts.'
        );

        $request->validate([
            'file' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store('expense-receipts/'.$expense->id, 'local');

        $expense->receipt_path = $path;
        $expense->has_receipt = true;
        $expense->save();

        return response()->json([
            'data' => [
                'id' => $expense->id,
                'has_receipt' => true,
                'receipt_path' => $expense->receipt_path,
            ],
        ]);
    }

    /**
     * @return StreamedResponse
     */
    public function export(Request $request)
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            'You do not have permission to export expenses.'
        );

        $type = $request->query('type', 'all');
        $query = Expense::query()->with(['category', 'vendor', 'shipment']);

        if ($type === 'shipment') {
            $query->whereNotNull('shipment_id');
        } elseif ($type === 'general') {
            $query->whereNull('shipment_id');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('description', 'like', '%'.$search.'%')
                    ->orWhere('invoice_number', 'like', '%'.$search.'%');
            });
        }

        if ($month = $request->query('month')) {
            $parts = explode('-', $month);
            if (count($parts) === 2) {
                $query->whereYear('expense_date', (int) $parts[0])->whereMonth('expense_date', (int) $parts[1]);
            }
        }

        if ($currency = $request->query('currency')) {
            $query->where('currency_code', $currency);
        }

        $expenses = $query->orderByDesc('expense_date')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="expenses-export-'.date('Y-m-d').'.csv"',
        ];

        $callback = static function () use ($expenses): void {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, [
                'id', 'type', 'bl_number', 'category', 'description', 'amount', 'currency',
                'vendor', 'payment_method', 'expense_date', 'invoice_number', 'has_receipt',
            ]);

            foreach ($expenses as $expense) {
                fputcsv($fh, [
                    $expense->id,
                    $expense->shipment_id ? 'shipment' : 'general',
                    $expense->shipment?->bl_number ?? '',
                    $expense->category?->name ?? '',
                    $expense->description,
                    $expense->amount,
                    $expense->currency_code,
                    $expense->vendor?->name ?? '',
                    $expense->payment_method ?? '',
                    $expense->expense_date?->toDateString() ?? '',
                    $expense->invoice_number ?? '',
                    $expense->has_receipt ? 'yes' : 'no',
                ]);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }
}
