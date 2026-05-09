<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use Illuminate\Database\Seeder;

/**
 * Operational treasury cash wallets (fixed currency governance in {@see BankAccount::allowedTreasuryCurrencyCodes()}).
 *
 * Authoritative list of the three canonical wallets — shared by:
 *  - the seeder (`php artisan db:seed --class=TreasuryCashWalletsSeeder`),
 *  - {@see \App\Http\Controllers\Api\V1\CashWalletController::index} (auto-seed on read),
 *  - {@see \App\Http\Controllers\Api\V1\TreasuryController::bankOverview} (auto-seed before
 *    rendering the Treasury page so the "no wallets yet" empty state never appears).
 */
class TreasuryCashWalletsSeeder extends Seeder
{
    /**
     * Canonical operational wallets keyed by `cash_wallet_kind`.
     *
     * @return array<string, array{bank_name: string, account_name: string, supported_currencies: list<string>}>
     */
    public static function canonicalWallets(): array
    {
        return [
            BankAccount::CASH_WALLET_NSP => [
                'bank_name' => 'NSP Cash Box',
                'account_name' => 'NSP',
                'supported_currencies' => ['EGP'],
            ],
            BankAccount::CASH_WALLET_VODAFONE => [
                'bank_name' => 'Vodafone Cash',
                'account_name' => 'Vodafone Cash',
                'supported_currencies' => ['EGP'],
            ],
            BankAccount::CASH_WALLET_PHYSICAL => [
                'bank_name' => 'Cash Treasury (الصندوق النقدي)',
                'account_name' => 'Cash Treasury',
                'supported_currencies' => ['EGP', 'USD', 'EUR'],
            ],
        ];
    }

    /**
     * Idempotent ensure-seeded for runtime callers (controllers). Uses `firstOrCreate` so
     * existing rows keep their user-edited labels — the seeder’s `updateOrCreate` is reserved
     * for explicit re-seeds via Artisan when an admin wants to reset the canonical names.
     */
    public static function ensureSeeded(): void
    {
        foreach (self::canonicalWallets() as $kind => $defaults) {
            BankAccount::query()->firstOrCreate(
                [
                    'treasury_account_kind' => BankAccount::TREASURY_KIND_CASH_WALLET,
                    'cash_wallet_kind' => $kind,
                ],
                [
                    'bank_name' => $defaults['bank_name'],
                    'account_name' => $defaults['account_name'],
                    'account_number' => null,
                    'iban' => null,
                    'swift_code' => null,
                    'supported_currencies' => $defaults['supported_currencies'],
                    'is_active' => true,
                ]
            );
        }
    }

    public function run(): void
    {
        foreach (self::canonicalWallets() as $kind => $defaults) {
            BankAccount::query()->updateOrCreate(
                [
                    'treasury_account_kind' => BankAccount::TREASURY_KIND_CASH_WALLET,
                    'cash_wallet_kind' => $kind,
                ],
                [
                    'bank_name' => $defaults['bank_name'],
                    'account_name' => $defaults['account_name'],
                    'account_number' => null,
                    'iban' => null,
                    'swift_code' => null,
                    'supported_currencies' => $defaults['supported_currencies'],
                    'is_active' => true,
                ]
            );
        }
    }
}
