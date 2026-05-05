<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);
        return response()->json([
            'data' => BankAccount::query()->orderBy('bank_name')->orderBy('account_name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);
        $validated = $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            'account_name' => ['required', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:120'],
            'iban' => ['nullable', 'string', 'max:120'],
            'swift_code' => ['nullable', 'string', 'max:80'],
            'supported_currencies' => ['nullable', 'array'],
            'supported_currencies.*' => ['string', 'size:3'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $account = BankAccount::query()->create($validated);
        return response()->json(['data' => $account], 201);
    }

    public function update(Request $request, BankAccount $bankAccount): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);
        $validated = $request->validate([
            'bank_name' => ['sometimes', 'string', 'max:255'],
            'account_name' => ['sometimes', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:120'],
            'iban' => ['nullable', 'string', 'max:120'],
            'swift_code' => ['nullable', 'string', 'max:80'],
            'supported_currencies' => ['nullable', 'array'],
            'supported_currencies.*' => ['string', 'size:3'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $bankAccount->fill($validated);
        $bankAccount->save();
        return response()->json(['data' => $bankAccount->fresh()]);
    }

    public function destroy(Request $request, BankAccount $bankAccount): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);
        $bankAccount->delete();
        return response()->json(['message' => __('Bank account deleted.')]);
    }
}
