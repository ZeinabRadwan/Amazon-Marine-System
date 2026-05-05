<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'type',
        'invoice_id',
        'vendor_bill_id',
        'client_id',
        'vendor_id',
        'shipment_id',
        'amount',
        'currency_code',
        'source_account_id',
        'target_account_id',
        'target_currency_code',
        'exchange_rate',
        'converted_amount',
        'method',
        'reference',
        'notes',
        'paid_at',
        'created_by_id',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'exchange_rate' => 'decimal:8',
        'converted_amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Invoice, Payment>
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * @return BelongsTo<VendorBill, Payment>
     */
    public function vendorBill(): BelongsTo
    {
        return $this->belongsTo(VendorBill::class);
    }

    /**
     * @return BelongsTo<Client, Payment>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<Vendor, Payment>
     */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /**
     * @return BelongsTo<Shipment, Payment>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return BelongsTo<BankAccount, Payment>
     */
    public function sourceAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'source_account_id');
    }

    /**
     * @return BelongsTo<BankAccount, Payment>
     */
    public function targetAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'target_account_id');
    }

    /**
     * @return BelongsTo<User, Payment>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * @return HasMany<TreasuryEntry>
     */
    public function treasuryEntries(): HasMany
    {
        return $this->hasMany(TreasuryEntry::class);
    }
}
