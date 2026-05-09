<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    public const TREASURY_KIND_BANK = 'bank';

    public const TREASURY_KIND_CASH_WALLET = 'cash_wallet';

    public const CASH_WALLET_NSP = 'nsp';

    public const CASH_WALLET_VODAFONE = 'vodafone';

    public const CASH_WALLET_PHYSICAL = 'physical';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'bank_name',
        'account_name',
        'account_number',
        'iban',
        'swift_code',
        'supported_currencies',
        'is_active',
        'treasury_account_kind',
        'cash_wallet_kind',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'supported_currencies' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Effective ISO currency codes allowed for ledger legs on this account (payments + treasury entries).
     * Banks: configured supported_currencies. Cash wallets: fixed governance rules (no dynamic assignment).
     *
     * @return list<string>
     */
    public function allowedTreasuryCurrencyCodes(): array
    {
        $kind = strtolower(trim((string) ($this->treasury_account_kind ?: self::TREASURY_KIND_BANK)));

        if ($kind === self::TREASURY_KIND_CASH_WALLET) {
            return match ($this->cash_wallet_kind) {
                self::CASH_WALLET_NSP, self::CASH_WALLET_VODAFONE => ['EGP'],
                self::CASH_WALLET_PHYSICAL => ['EGP', 'USD', 'EUR'],
                default => ['EGP'],
            };
        }

        $supported = [];
        $raw = $this->supported_currencies;
        if (is_array($raw)) {
            foreach ($raw as $c) {
                $u = strtoupper(trim((string) $c));
                if ($u !== '' && strlen($u) === 3) {
                    $supported[] = $u;
                }
            }
        }

        return array_values(array_unique($supported));
    }

    public function isCashWallet(): bool
    {
        return strtolower(trim((string) ($this->treasury_account_kind ?? ''))) === self::TREASURY_KIND_CASH_WALLET;
    }
}
