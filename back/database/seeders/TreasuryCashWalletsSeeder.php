<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use Illuminate\Database\Seeder;

/**
 * Operational treasury cash wallets (fixed currency governance in {@see BankAccount::allowedTreasuryCurrencyCodes()}).
 */
class TreasuryCashWalletsSeeder extends Seeder
{
    public function run(): void
    {
        $wallets = [
            [
                'cash_wallet_kind' => BankAccount::CASH_WALLET_NSP,
                'bank_name' => 'NSP Cash Box',
                'account_name' => 'NSP',
                'supported_currencies' => ['EGP'],
            ],
            [
                'cash_wallet_kind' => BankAccount::CASH_WALLET_VODAFONE,
                'bank_name' => 'Vodafone Cash',
                'account_name' => 'Vodafone Cash',
                'supported_currencies' => ['EGP'],
            ],
            [
                'cash_wallet_kind' => BankAccount::CASH_WALLET_PHYSICAL,
                'bank_name' => 'Physical Cash (صندوق النقدية)',
                'account_name' => 'Physical cash',
                'supported_currencies' => ['EGP', 'USD', 'EUR'],
            ],
        ];

        foreach ($wallets as $w) {
            BankAccount::query()->updateOrCreate(
                [
                    'treasury_account_kind' => BankAccount::TREASURY_KIND_CASH_WALLET,
                    'cash_wallet_kind' => $w['cash_wallet_kind'],
                ],
                [
                    'bank_name' => $w['bank_name'],
                    'account_name' => $w['account_name'],
                    'account_number' => null,
                    'iban' => null,
                    'swift_code' => null,
                    'supported_currencies' => $w['supported_currencies'],
                    'is_active' => true,
                ]
            );
        }
    }
}
