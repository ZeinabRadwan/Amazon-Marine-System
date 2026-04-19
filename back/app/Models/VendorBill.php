<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Traits\HasFiles;

class VendorBill extends Model
{
    use HasFactory, HasFiles;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'bill_number',
        'vendor_id',
        'shipment_id',
        'bill_date',
        'due_date',
        'status',
        'currency_code',
        'total_amount',
        'tax_amount',
        'net_amount',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'bill_date' => 'date',
        'due_date' => 'date',
        'total_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<Vendor, VendorBill>
     */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /**
     * @return BelongsTo<Shipment, VendorBill>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return HasMany<VendorBillItem>
     */
    public function items(): HasMany
    {
        return $this->hasMany(VendorBillItem::class);
    }

    /**
     * @return HasMany<Payment>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
