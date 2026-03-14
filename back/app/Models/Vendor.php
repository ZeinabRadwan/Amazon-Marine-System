<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Vendor extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'type',
        'email',
        'phone',
        'city',
        'country',
        'address',
        'payment_terms',
        'notes',
    ];

    /**
     * @return HasMany<Shipment>
     */
    public function lineShipments(): HasMany
    {
        return $this->hasMany(Shipment::class, 'line_vendor_id');
    }

    /**
     * @return HasMany<ShipmentOperation>
     */
    public function transportOperations(): HasMany
    {
        return $this->hasMany(ShipmentOperation::class, 'transport_contractor_id');
    }

    /**
     * @return HasMany<ShipmentOperation>
     */
    public function customsOperations(): HasMany
    {
        return $this->hasMany(ShipmentOperation::class, 'customs_broker_id');
    }

    /**
     * @return HasMany<ShipmentOperation>
     */
    public function insuranceOperations(): HasMany
    {
        return $this->hasMany(ShipmentOperation::class, 'insurance_company_id');
    }

    /**
     * @return HasMany<ShipmentOperation>
     */
    public function overseasOperations(): HasMany
    {
        return $this->hasMany(ShipmentOperation::class, 'overseas_agent_id');
    }

    /**
     * @return HasMany<VendorBill>
     */
    public function vendorBills(): HasMany
    {
        return $this->hasMany(VendorBill::class);
    }

    /**
     * @return HasMany<Payment>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return MorphMany<Visit>
     */
    public function visits(): MorphMany
    {
        return $this->morphMany(Visit::class, 'visitable');
    }
}
