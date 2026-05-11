<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BankAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        $query = BankAccount::query()->orderBy('bank_name')->orderBy('account_name');

        // Optional `?kind=bank|cash_wallet` filter — Settings uses `kind=bank` to narrow the
        // banks-only table; payment forms keep the unscoped default (banks + cash wallets together).
        $kind = strtolower(trim((string) $request->query('kind', '')));
        if ($kind === BankAccount::TREASURY_KIND_BANK || $kind === BankAccount::TREASURY_KIND_CASH_WALLET) {
            $query->where('treasury_account_kind', $kind);
        }

        $rows = $query->get()->map(static function (BankAccount $b): array {
            return array_merge($b->toArray(), [
                'allowed_currencies' => $b->allowedTreasuryCurrencyCodes(),
            ]);
        });

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);
        $validated = $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            // `account_name` is optional from the UI — Settings only collects bank-identity
            // fields (bank name, account #, IBAN, SWIFT, currencies). When omitted we
            // mirror the bank name so the legacy column stays populated for reports/dropdowns.
            'account_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:120'],
            'iban' => ['nullable', 'string', 'max:120'],
            'swift_code' => ['nullable', 'string', 'max:80'],
            'supported_currencies' => ['nullable', 'array'],
            'supported_currencies.*' => ['string', 'size:3'],
            'is_active' => ['nullable', 'boolean'],
            'treasury_account_kind' => ['nullable', 'string', 'in:bank,cash_wallet'],
            'cash_wallet_kind' => [
                'nullable',
                'string',
                'in:nsp,vodafone,physical',
                Rule::requiredIf(static fn () => ($request->input('treasury_account_kind') ?? BankAccount::TREASURY_KIND_BANK) === BankAccount::TREASURY_KIND_CASH_WALLET),
            ],
        ]);

        $accountName = trim((string) ($validated['account_name'] ?? ''));
        $validated['account_name'] = $accountName !== '' ? $accountName : $validated['bank_name'];

        $account = BankAccount::query()->create($validated);

        return response()->json(['data' => $account], 201);
    }

    public function update(Request $request, BankAccount $bankAccount): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);
        $validated = $request->validate([
            'bank_name' => ['sometimes', 'string', 'max:255'],
            // Same nullable-with-fallback rule as `store` — the Settings UI no longer collects
            // a separate "account name", so we mirror the bank name when nothing is sent.
            'account_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:120'],
            'iban' => ['nullable', 'string', 'max:120'],
            'swift_code' => ['nullable', 'string', 'max:80'],
            'supported_currencies' => ['nullable', 'array'],
            'supported_currencies.*' => ['string', 'size:3'],
            'is_active' => ['nullable', 'boolean'],
            'treasury_account_kind' => ['nullable', 'string', 'in:bank,cash_wallet'],
            'cash_wallet_kind' => [
                'nullable',
                'string',
                'in:nsp,vodafone,physical',
                Rule::requiredIf(static function () use ($request, $bankAccount): bool {
                    $kind = $request->input('treasury_account_kind') ?? $bankAccount->treasury_account_kind ?? BankAccount::TREASURY_KIND_BANK;

                    return $kind === BankAccount::TREASURY_KIND_CASH_WALLET;
                }),
            ],
        ]);

        if (array_key_exists('account_name', $validated)) {
            $accountName = trim((string) ($validated['account_name'] ?? ''));
            $validated['account_name'] = $accountName !== ''
                ? $accountName
                : ($validated['bank_name'] ?? $bankAccount->bank_name);
        }

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
