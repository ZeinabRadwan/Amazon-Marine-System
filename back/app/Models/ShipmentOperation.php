<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentOperation extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'shipment_id',
        'service_types',
        'transport_contractor_id',
        'customs_broker_id',
        'insurance_company_id',
        'overseas_agent_id',
        'cut_off_date',
        'etd',
        'eta',
        'ops_loading_date',
        'notes',
        'transport_instructions',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'service_types' => 'array',
        'cut_off_date' => 'date',
        'etd' => 'datetime',
        'eta' => 'datetime',
        'ops_loading_date' => 'date',
    ];

    /**
     * @return BelongsTo<Shipment, ShipmentOperation>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return BelongsTo<Vendor, ShipmentOperation>
     */
    public function transportContractor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'transport_contractor_id');
    }

    /**
     * @return BelongsTo<Vendor, ShipmentOperation>
     */
    public function customsBroker(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'customs_broker_id');
    }

    /**
     * @return BelongsTo<Vendor, ShipmentOperation>
     */
    public function insuranceCompany(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'insurance_company_id');
    }

    /**
     * @return BelongsTo<Vendor, ShipmentOperation>
     */
    public function overseasAgent(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'overseas_agent_id');
    }
}
