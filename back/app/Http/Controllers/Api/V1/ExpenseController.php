<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExpenseRequest;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Shipment;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Services\FileService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpenseController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view expenses summary.')
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
            __('You do not have permission to view shipment expenses.')
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

        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
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
                'shipment_id' => $expense->shipment_id,
                'expense_category_id' => $expense->expense_category_id,
                'bl_number' => $expense->shipment?->bl_number ?? '',
                'category_name' => $expense->category?->name ?? '',
                'description' => $expense->description,
                'amount' => (float) $expense->amount,
                'currency_code' => $expense->currency_code,
                'vendor_name' => $expense->vendor?->name ?? '',
                'vendor_id' => $expense->vendor_id,
                'expense_date' => $expense->expense_date?->toDateString(),
                'invoice_number' => $expense->invoice_number,
                'has_receipt' => (bool) $expense->has_receipt,
                'receipt_path' => $expense->receipt_path,
            ];
        })->values();

        return response()->json(['data' => $rows]);
    }

    public function generalIndex(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view general expenses.')
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
                'expense_category_id' => $expense->expense_category_id,
                'category_name' => $expense->category?->name ?? '',
                'description' => $expense->description,
                'amount' => (float) $expense->amount,
                'currency_code' => $expense->currency_code,
                'payment_method' => $expense->payment_method,
                'expense_date' => $expense->expense_date?->toDateString(),
                'invoice_number' => $expense->invoice_number,
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

        if ($expense->shipment_id) {
            $shipment = Shipment::find($expense->shipment_id);
            if ($shipment) {
                ActivityLogger::log('shipment.financial_expense_created', $shipment, [
                    'expense_id' => $expense->id,
                    'amount' => (float) $expense->amount,
                    'currency_code' => $expense->currency_code,
                ]);

                Shipment::recomputeTotals((int) $expense->shipment_id);
            }
        }

        return response()->json([
            'data' => $expense->load(['category', 'vendor', 'shipment']),
        ], 201);
    }

    public function show(Request $request, Expense $expense): JsonResponse
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to view this expense.')
        );

        return response()->json([
            'data' => $expense->load(['category', 'vendor', 'shipment']),
        ]);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('accounting.manage') || $user->hasRole('admin')),
            403,
            __('You do not have permission to update expenses.')
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

        if ($expense->shipment_id) {
            $shipment = Shipment::find($expense->shipment_id);
            if ($shipment) {
                ActivityLogger::log('shipment.financial_expense_updated', $shipment, [
                    'expense_id' => $expense->id,
                    'changes' => $expense->getChanges(),
                ]);

                Shipment::recomputeTotals((int) $expense->shipment_id);
            }
        }

        return response()->json([
            'data' => $expense->fresh(['category', 'vendor', 'shipment']),
        ]);
    }

    public function destroy(Request $request, Expense $expense): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('accounting.manage') || $user->hasRole('admin')),
            403,
            __('You do not have permission to delete expenses.')
        );

        $shipmentId = $expense->shipment_id;

        $expense->delete();

        if ($shipmentId) {
            Shipment::recomputeTotals((int) $shipmentId);
        }

        return response()->json([
            'message' => __('Expense deleted.'),
        ]);
    }

    public function uploadReceipt(Request $request, Expense $expense, FileService $fileService): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('accounting.manage') || $user->hasRole('admin')),
            403,
            __('You do not have permission to upload expense receipts.')
        );

        $request->validate([
            'file' => ['required', 'file', 'mimes:jpeg,jpg,png,pdf', 'max:10240'],
            'disk' => ['sometimes', 'string', 'in:local,google_drive'],
        ]);

        $fileRecord = $fileService->upload(
            file: $request->file('file'),
            collection: 'receipts',
            diskName: $request->input('disk'),
            owner: $expense
        );

        $expense->has_receipt = true;
        $expense->save();

        if ($expense->shipment_id) {
            $shipment = Shipment::find($expense->shipment_id);
            if ($shipment) {
                ActivityLogger::log('shipment.financial_expense_receipt_uploaded', $shipment, [
                    'expense_id' => $expense->id,
                    'file_id' => $fileRecord->id,
                ]);
            }
        }

        return response()->json([
            'data' => [
                'id' => $expense->id,
                'has_receipt' => true,
                'file_record' => $fileRecord,
            ],
        ]);
    }

    /**
     * Stream / download the stored receipt file for an expense.
     */
    public function downloadReceipt(Request $request, Expense $expense)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('accounting.view') || $user->hasRole('admin')),
            403,
            __('You do not have permission to download expense receipts.')
        );

        $fileRecord = $expense->files()->where('collection', 'receipts')->latest()->first();

        if (! $fileRecord) {
            // Fallback to legacy path if exists
            $path = $expense->receipt_path;
            if ($path && Storage::disk('local')->exists($path)) {
                return response()->download(Storage::disk('local')->path($path));
            }
            abort(404, __('Receipt file not found.'));
        }

        return redirect($fileRecord->url);
    }

    /**
     * @return StreamedResponse
     */
    public function export(Request $request)
    {
        abort_unless(
            $request->user()?->can('accounting.view'),
            403,
            __('You do not have permission to export expenses.')
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
                    $expense->expense_date?->format('d/m/Y') ?? '',
                    $expense->invoice_number ?? '',
                    $expense->has_receipt ? 'yes' : 'no',
                ]);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }
}
