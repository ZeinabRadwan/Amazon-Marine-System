<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Port extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'country',
        'active',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'active' => 'bool',
    ];

    /**
     * @return HasMany<SDForm>
     */
    public function sdFormsAsPol(): HasMany
    {
        return $this->hasMany(SDForm::class, 'pol_id');
    }

    /**
     * @return HasMany<SDForm>
     */
    public function sdFormsAsPod(): HasMany
    {
        return $this->hasMany(SDForm::class, 'pod_id');
    }

    /**
     * @return HasMany<Shipment>
     */
    public function originShipments(): HasMany
    {
        return $this->hasMany(Shipment::class, 'origin_port_id');
    }

    /**
     * @return HasMany<Shipment>
     */
    public function destinationShipments(): HasMany
    {
        return $this->hasMany(Shipment::class, 'destination_port_id');
    }
}
