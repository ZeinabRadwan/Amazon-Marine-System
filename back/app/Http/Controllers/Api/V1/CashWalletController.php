<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Payment;
use App\Models\TreasuryEntry;
use App\Services\TreasuryLedgerBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Operational treasury accounts — dynamic CRUD; no auto-seeded defaults.
 */
class CashWalletController extends Controller
{
    public function __construct(
        private readonly TreasuryLedgerBalanceService $ledgerBalance,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        $balancesByAccount = $this->ledgerBalance->computeRawBalancesByAccount();

        $wallets = BankAccount::query()
            ->where('treasury_account_kind', BankAccount::TREASURY_KIND_CASH_WALLET)
            ->orderBy('name_en')
            ->orderBy('name_ar')
            ->orderBy('bank_name')
            ->get()
            ->map(fn (BankAccount $w) => $this->presentWallet($w, $balancesByAccount));

        return response()->json(['data' => $wallets]);
    }

    public function show(Request $request, BankAccount $cashWallet): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);
        $this->assertIsCashWallet($cashWallet);

        $balancesByAccount = $this->ledgerBalance->computeRawBalancesByAccount();

        return response()->json(['data' => $this->presentWallet($cashWallet, $balancesByAccount)]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);

        $validated = $this->validateWalletPayload($request, null);

        $wallet = new BankAccount($validated);
        $wallet->treasury_account_kind = BankAccount::TREASURY_KIND_CASH_WALLET;
        $wallet->syncLegacyNameFields();
        $wallet->save();

        $balancesByAccount = $this->ledgerBalance->computeRawBalancesByAccount();

        return response()->json(['data' => $this->presentWallet($wallet->fresh(), $balancesByAccount)], 201);
    }

    public function update(Request $request, BankAccount $cashWallet): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);
        $this->assertIsCashWallet($cashWallet);

        $validated = $this->validateWalletPayload($request, $cashWallet);

        $cashWallet->fill($validated);
        $cashWallet->syncLegacyNameFields();
        $cashWallet->save();

        $balancesByAccount = $this->ledgerBalance->computeRawBalancesByAccount();

        return response()->json(['data' => $this->presentWallet($cashWallet->fresh(), $balancesByAccount)]);
    }

    public function destroy(Request $request, BankAccount $cashWallet): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);
        $this->assertIsCashWallet($cashWallet);

        if ($this->accountHasLedgerActivity($cashWallet->id)) {
            throw ValidationException::withMessages([
                'id' => [__('bank.operational_account_has_ledger_entries')],
            ]);
        }

        $cashWallet->delete();

        return response()->json(['message' => __('bank.operational_account_deleted')]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateWalletPayload(Request $request, ?BankAccount $existing): array
    {
        $accountTypeRule = Rule::in(array_merge(
            BankAccount::OPERATIONAL_ACCOUNT_TYPES,
            [BankAccount::CASH_WALLET_NSP, BankAccount::CASH_WALLET_VODAFONE, BankAccount::CASH_WALLET_PHYSICAL],
        ));

        $validated = $request->validate([
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'cash_wallet_kind' => [$existing ? 'sometimes' : 'required', 'string', 'max:32', $accountTypeRule],
            'account_type' => ['sometimes', 'string', 'max:32', $accountTypeRule],
            'supported_currencies' => [$existing ? 'sometimes' : 'required', 'array', 'min:1'],
            'supported_currencies.*' => ['string', 'size:3'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $nameAr = trim((string) ($validated['name_ar'] ?? ''));
        $nameEn = trim((string) ($validated['name_en'] ?? ''));
        if ($nameAr === '' && $nameEn === '') {
            throw ValidationException::withMessages([
                'name_en' => [__('bank.operational_account_name_required')],
            ]);
        }

        $type = BankAccount::normalizeOperationalAccountType(
            $validated['account_type'] ?? $validated['cash_wallet_kind'] ?? $existing?->cash_wallet_kind ?? '',
        );
        if ($type === '' || ! BankAccount::isValidOperationalAccountType($type)) {
            throw ValidationException::withMessages([
                'cash_wallet_kind' => [__('bank.operational_account_type_invalid')],
            ]);
        }

        $currenciesRaw = array_key_exists('supported_currencies', $validated)
            ? $validated['supported_currencies']
            : ($existing?->supported_currencies ?? []);
        $currencies = $this->normalizeCurrencyList(is_array($currenciesRaw) ? $currenciesRaw : []);
        if ($currencies === []) {
            throw ValidationException::withMessages([
                'supported_currencies' => [__('bank.operational_account_currencies_required')],
            ]);
        }

        $this->assertUniqueOperationalNames($nameAr, $nameEn, $existing?->id);

        $payload = [
            'name_ar' => $nameAr !== '' ? $nameAr : null,
            'name_en' => $nameEn !== '' ? $nameEn : null,
            'supported_currencies' => $currencies,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : ($existing?->is_active ?? true),
            'notes' => array_key_exists('notes', $validated) ? (trim((string) ($validated['notes'] ?? '')) ?: null) : $existing?->notes,
        ];

        if (! $existing) {
            $payload['cash_wallet_kind'] = $type;
        }

        return $payload;
    }

    /**
     * @param  list<string>|null  $requested
     * @return list<string>
     */
    private function normalizeCurrencyList(?array $requested): array
    {
        if (! is_array($requested)) {
            return [];
        }

        $upper = array_values(array_unique(array_filter(array_map(
            static fn ($c) => strtoupper(trim((string) $c)),
            $requested,
        ), static fn ($c) => strlen($c) === 3)));

        return $upper;
    }

    private function assertUniqueOperationalNames(string $nameAr, string $nameEn, ?int $excludeId): void
    {
        $candidates = array_values(array_filter([
            $nameAr !== '' ? mb_strtolower($nameAr) : null,
            $nameEn !== '' ? mb_strtolower($nameEn) : null,
        ]));

        if ($candidates === []) {
            return;
        }

        $query = BankAccount::query()
            ->where('treasury_account_kind', BankAccount::TREASURY_KIND_CASH_WALLET);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        $existing = $query->get(['id', 'name_ar', 'name_en', 'bank_name']);

        foreach ($existing as $row) {
            $rowNames = array_values(array_filter([
                trim((string) ($row->name_ar ?? '')) !== '' ? mb_strtolower((string) $row->name_ar) : null,
                trim((string) ($row->name_en ?? '')) !== '' ? mb_strtolower((string) $row->name_en) : null,
                trim((string) ($row->bank_name ?? '')) !== '' ? mb_strtolower((string) $row->bank_name) : null,
            ]));
            foreach ($candidates as $candidate) {
                if (in_array($candidate, $rowNames, true)) {
                    throw ValidationException::withMessages([
                        'name_en' => [__('bank.operational_account_name_duplicate')],
                    ]);
                }
            }
        }
    }

    private function accountHasLedgerActivity(int $accountId): bool
    {
        if (TreasuryEntry::query()
            ->where(function ($q) use ($accountId): void {
                $q->where('account_id', $accountId)->orWhere('counter_account_id', $accountId);
            })
            ->exists()) {
            return true;
        }

        return Payment::query()
            ->where(function ($q) use ($accountId): void {
                $q->where('source_account_id', $accountId)->orWhere('target_account_id', $accountId);
            })
            ->exists();
    }

    private function assertIsCashWallet(BankAccount $row): void
    {
        if (! $row->isCashWallet()) {
            abort(404, __('Cash wallet not found.'));
        }
    }

    /**
     * @param  array<string, array<string, float>>  $balancesByAccount
     * @return array<string, mixed>
     */
    private function presentWallet(BankAccount $w, array $balancesByAccount): array
    {
        $idKey = (string) $w->id;
        $rawMap = $balancesByAccount[$idKey] ?? [];
        $balanceByCurrency = [];
        foreach ($rawMap as $cur => $val) {
            $balanceByCurrency[$this->ledgerBalance->normalizeCurrency((string) $cur)] = round(max(0, (float) $val), 2);
        }

        $primary = $w->primaryDisplayName();

        return [
            'id' => $w->id,
            'name' => $primary,
            'display_name' => $primary,
            'name_ar' => $w->name_ar,
            'name_en' => $w->name_en,
            'bank_name' => $w->bank_name,
            'account_name' => $w->account_name,
            'cash_wallet_kind' => $w->cash_wallet_kind,
            'account_type' => BankAccount::normalizeOperationalAccountType($w->cash_wallet_kind),
            'treasury_account_kind' => BankAccount::TREASURY_KIND_CASH_WALLET,
            'supported_currencies' => $w->normalizedSupportedCurrencyCodes(),
            'allowed_currencies' => $w->allowedTreasuryCurrencyCodes(),
            'balance_by_currency' => $balanceByCurrency,
            'notes' => $w->notes,
            'is_active' => (bool) $w->is_active,
            'created_at' => $w->created_at?->toIso8601String(),
            'updated_at' => $w->updated_at?->toIso8601String(),
        ];
    }
}
