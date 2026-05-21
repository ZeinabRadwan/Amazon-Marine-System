<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    public const TREASURY_KIND_BANK = 'bank';

    public const TREASURY_KIND_CASH_WALLET = 'cash_wallet';

    /** @deprecated Legacy kind codes — still accepted when reading existing rows. */
    public const CASH_WALLET_NSP = 'nsp';

    /** @deprecated */
    public const CASH_WALLET_VODAFONE = 'vodafone';

    /** @deprecated */
    public const CASH_WALLET_PHYSICAL = 'physical';

    /**
     * Configurable operational treasury account types (stored in `cash_wallet_kind`).
     *
     * @var list<string>
     */
    public const OPERATIONAL_ACCOUNT_TYPES = [
        'cash_box',
        'cash_treasury',
        'nsp',
        'vodafone_cash',
        'instapay',
        'petty_cash',
        'mobile_wallet',
        'other',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'bank_name',
        'account_name',
        'name_ar',
        'name_en',
        'account_number',
        'iban',
        'swift_code',
        'supported_currencies',
        'notes',
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
     * Effective ISO currency codes allowed for ledger legs on this account.
     *
     * @return list<string>
     */
    public function allowedTreasuryCurrencyCodes(): array
    {
        $kind = strtolower(trim((string) ($this->treasury_account_kind ?: self::TREASURY_KIND_BANK)));

        if ($kind === self::TREASURY_KIND_CASH_WALLET) {
            return $this->normalizedSupportedCurrencyCodes();
        }

        return $this->normalizedSupportedCurrencyCodes();
    }

    /**
     * @return list<string>
     */
    public function normalizedSupportedCurrencyCodes(): array
    {
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

    public function isBank(): bool
    {
        return ! $this->isCashWallet();
    }

    /**
     * Primary display label (English preferred, then Arabic, then legacy bank_name).
     */
    public function primaryDisplayName(): string
    {
        $en = trim((string) ($this->name_en ?? ''));
        if ($en !== '') {
            return $en;
        }
        $ar = trim((string) ($this->name_ar ?? ''));
        if ($ar !== '') {
            return $ar;
        }

        return trim((string) ($this->bank_name ?? $this->account_name ?? ''));
    }

    /**
     * Sync legacy `bank_name` / `account_name` from bilingual names for dropdowns & reports.
     */
    public function syncLegacyNameFields(): void
    {
        $primary = $this->primaryDisplayName();
        if ($primary !== '') {
            $this->bank_name = $primary;
            $this->account_name = $primary;
        }
    }

    public static function normalizeOperationalAccountType(?string $type): string
    {
        $t = strtolower(trim((string) $type));
        if ($t === 'vodafone') {
            return 'vodafone_cash';
        }
        if ($t === 'physical') {
            return 'cash_treasury';
        }

        return $t;
    }

    public static function isValidOperationalAccountType(string $type): bool
    {
        $normalized = self::normalizeOperationalAccountType($type);

        return in_array($normalized, self::OPERATIONAL_ACCOUNT_TYPES, true)
            || in_array($normalized, [self::CASH_WALLET_NSP, self::CASH_WALLET_VODAFONE, self::CASH_WALLET_PHYSICAL], true);
    }
}
