<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use Database\Seeders\TreasuryCashWalletsSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Cash wallets are the operational treasury wallets (NSP / Vodafone Cash / Cash Treasury).
 * They live inside the same `bank_accounts` table as banks (discriminated by
 * {@see BankAccount::TREASURY_KIND_CASH_WALLET}) so the treasury ledger keeps a single
 * `account_id` foreign key to `bank_accounts.id`. This controller exposes them as a
 * dedicated `/cash-wallets` resource so the UI/Settings can treat them as an independent
 * module without dragging banks into the same list.
 *
 * The three operational wallets are auto-ensured on every read so the UI never shows an
 * empty state — they are first-class system entities.
 */
class CashWalletController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);

        TreasuryCashWalletsSeeder::ensureSeeded();

        $wallets = BankAccount::query()
            ->where('treasury_account_kind', BankAccount::TREASURY_KIND_CASH_WALLET)
            ->orderByRaw('FIELD(cash_wallet_kind, ?, ?, ?)', [
                BankAccount::CASH_WALLET_PHYSICAL,
                BankAccount::CASH_WALLET_NSP,
                BankAccount::CASH_WALLET_VODAFONE,
            ])
            ->orderBy('bank_name')
            ->get()
            ->map(fn (BankAccount $w) => $this->presentWallet($w));

        return response()->json(['data' => $wallets]);
    }

    public function show(Request $request, BankAccount $cashWallet): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.view'), 403);
        $this->assertIsCashWallet($cashWallet);

        return response()->json(['data' => $this->presentWallet($cashWallet)]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);

        // Per the Settings spec, a treasury wallet has *only* a name + supported currencies
        // (no banking-identity fields, no separate display name). `account_name` is mirrored
        // server-side from `bank_name` so legacy code paths that still read it stay valid.
        $validated = $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            'cash_wallet_kind' => ['required', 'string', Rule::in([
                BankAccount::CASH_WALLET_NSP,
                BankAccount::CASH_WALLET_VODAFONE,
                BankAccount::CASH_WALLET_PHYSICAL,
            ])],
            'supported_currencies' => ['nullable', 'array'],
            'supported_currencies.*' => ['string', 'size:3'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        // The three canonical wallets are unique by `cash_wallet_kind` to keep ledger
        // identity stable; surface a clean validation error instead of a duplicate row.
        $exists = BankAccount::query()
            ->where('treasury_account_kind', BankAccount::TREASURY_KIND_CASH_WALLET)
            ->where('cash_wallet_kind', $validated['cash_wallet_kind'])
            ->exists();
        if ($exists) {
            throw ValidationException::withMessages([
                'cash_wallet_kind' => [__('A cash wallet of this kind already exists.')],
            ]);
        }

        $wallet = BankAccount::query()->create([
            'bank_name' => $validated['bank_name'],
            'account_name' => $validated['bank_name'],
            'account_number' => null,
            'iban' => null,
            'swift_code' => null,
            'supported_currencies' => $this->normalizeCurrenciesForKind(
                $validated['cash_wallet_kind'],
                $validated['supported_currencies'] ?? null,
            ),
            'is_active' => $validated['is_active'] ?? true,
            'treasury_account_kind' => BankAccount::TREASURY_KIND_CASH_WALLET,
            'cash_wallet_kind' => $validated['cash_wallet_kind'],
        ]);

        return response()->json(['data' => $this->presentWallet($wallet)], 201);
    }

    public function update(Request $request, BankAccount $cashWallet): JsonResponse
    {
        abort_unless($request->user()?->can('accounting.manage'), 403);
        $this->assertIsCashWallet($cashWallet);

        // Treasury wallets carry only a name + active flag from the UI. `cash_wallet_kind`
        // cannot change after creation (it pins currency rules and ledger identity), and
        // `account_name` is mirrored from `bank_name` automatically.
        $validated = $request->validate([
            'bank_name' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('bank_name', $validated)) {
            $cashWallet->bank_name = $validated['bank_name'];
            $cashWallet->account_name = $validated['bank_name'];
        }
        if (array_key_exists('is_active', $validated)) {
            $cashWallet->is_active = (bool) $validated['is_active'];
        }

        $cashWallet->save();

        return response()->json(['data' => $this->presentWallet($cashWallet->fresh())]);
    }

    /**
     * Cash wallet currency rules come from {@see BankAccount::allowedTreasuryCurrencyCodes()}
     * (NSP/Vodafone → EGP only; Physical/Cash Treasury → EGP+USD+EUR). Persisted
     * `supported_currencies` mirrors that policy so existing UI badges remain meaningful.
     *
     * @param  list<string>|null  $requested
     * @return list<string>
     */
    private function normalizeCurrenciesForKind(string $kind, ?array $requested): array
    {
        $allowed = match ($kind) {
            BankAccount::CASH_WALLET_NSP, BankAccount::CASH_WALLET_VODAFONE => ['EGP'],
            BankAccount::CASH_WALLET_PHYSICAL => ['EGP', 'USD', 'EUR'],
            default => ['EGP'],
        };

        if (! is_array($requested) || $requested === []) {
            return $allowed;
        }

        $upper = array_values(array_unique(array_filter(array_map(
            static fn ($c) => strtoupper(trim((string) $c)),
            $requested,
        ))));

        return array_values(array_intersect($allowed, $upper)) ?: $allowed;
    }

    private function assertIsCashWallet(BankAccount $row): void
    {
        if (! $row->isCashWallet()) {
            abort(404, __('Cash wallet not found.'));
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function presentWallet(BankAccount $w): array
    {
        return [
            'id' => $w->id,
            'name' => $w->bank_name,
            'display_name' => $w->bank_name,
            'account_name' => $w->account_name,
            'cash_wallet_kind' => $w->cash_wallet_kind,
            'treasury_account_kind' => BankAccount::TREASURY_KIND_CASH_WALLET,
            'supported_currencies' => is_array($w->supported_currencies) ? $w->supported_currencies : [],
            'allowed_currencies' => $w->allowedTreasuryCurrencyCodes(),
            'is_active' => (bool) $w->is_active,
            'created_at' => $w->created_at?->toIso8601String(),
            'updated_at' => $w->updated_at?->toIso8601String(),
        ];
    }
}
