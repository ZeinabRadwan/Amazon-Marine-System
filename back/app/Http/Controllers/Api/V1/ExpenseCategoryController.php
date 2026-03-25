<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('financial.view') || $user->can('accounting.view') || $user->hasRole('admin')),
            403,
            __('You do not have permission to list expense categories.')
        );

        $categories = ExpenseCategory::query()
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:expense_categories,code'],
        ]);

        $category = ExpenseCategory::create($validated);

        return response()->json([
            'data' => $category,
        ], 201);
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50', 'unique:expense_categories,code,' . $expenseCategory->id],
        ]);

        $expenseCategory->fill($validated);
        $expenseCategory->save();

        return response()->json([
            'data' => $expenseCategory,
        ]);
    }

    public function destroy(Request $request, ExpenseCategory $expenseCategory)
    {
        abort_unless($request->user()?->can('financial.manage'), 403);

        $expenseCategory->delete();

        return response()->json([
            'message' => __('Expense category deleted.'),
        ]);
    }
}

