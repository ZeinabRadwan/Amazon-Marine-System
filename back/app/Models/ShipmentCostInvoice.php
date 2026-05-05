<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentCostInvoice extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'shipment_id',
        'invoice_number',
        'invoice_date',
        'status',
        'items',
        'attachment_refs',
        'section_meta',
        'currency_totals',
        'total_amount',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'invoice_date' => 'date',
        'items' => 'array',
        'attachment_refs' => 'array',
        'section_meta' => 'array',
        'currency_totals' => 'array',
        'total_amount' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<Shipment, ShipmentCostInvoice>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }
}
