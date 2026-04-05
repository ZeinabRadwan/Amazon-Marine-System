<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'invoice_number',
        'invoice_type',
        'shipment_id',
        'client_id',
        'issue_date',
        'due_date',
        'status',
        'currency_id',
        'currency_code',
        'total_amount',
        'tax_amount',
        'is_vat_invoice',
        'net_amount',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'issue_date' => 'date',
        'due_date' => 'date',
        'currency_id' => 'integer',
        'total_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'is_vat_invoice' => 'bool',
        'net_amount' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<Client, Invoice>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<Shipment, Invoice>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return HasMany<InvoiceItem>
     */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /**
     * @return HasMany<Payment>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
