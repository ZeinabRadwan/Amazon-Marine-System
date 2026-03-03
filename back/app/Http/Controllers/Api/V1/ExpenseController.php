<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        $query = Expense::query()->with(['category', 'paidBy', 'shipment']);

        if ($categoryId = $request->query('category_id')) {
            $query->where('expense_category_id', $categoryId);
        }

        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('expense_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('expense_date', '<=', $to);
        }

        $expenses = $query->orderByDesc('expense_date')->get();

        return response()->json([
            'data' => $expenses,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $validated = $request->validate([
            'expense_category_id' => ['required', 'integer', 'exists:expense_categories,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency_code' => ['required', 'string', 'size:3'],
            'expense_date' => ['required', 'date'],
            'paid_by_id' => ['nullable', 'integer', 'exists:users,id'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
        ]);

        $expense = new Expense($validated);
        $expense->paid_by_id = $validated['paid_by_id'] ?? $request->user()->id;
        $expense->save();

        return response()->json([
            'data' => $expense->fresh(['category', 'paidBy', 'shipment']),
        ], 201);
    }

    public function show(Request $request, Expense $expense)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        return response()->json([
            'data' => $expense->load(['category', 'paidBy', 'shipment']),
        ]);
    }

    public function update(Request $request, Expense $expense)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $validated = $request->validate([
            'expense_category_id' => ['sometimes', 'integer', 'exists:expense_categories,id'],
            'description' => ['sometimes', 'string', 'max:255'],
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
            'currency_code' => ['sometimes', 'string', 'size:3'],
            'expense_date' => ['sometimes', 'date'],
            'paid_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'shipment_id' => ['sometimes', 'nullable', 'integer', 'exists:shipments,id'],
        ]);

        $expense->fill($validated);
        $expense->save();

        return response()->json([
            'data' => $expense->fresh(['category', 'paidBy', 'shipment']),
        ]);
    }

    public function destroy(Request $request, Expense $expense)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $expense->delete();

        return response()->json([
            'message' => 'Expense deleted.',
        ]);
    }
}

