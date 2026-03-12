<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentTrackingUpdate extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'shipment_id',
        'update_text',
        'created_by_id',
    ];

    /**
     * @return BelongsTo<Shipment, ShipmentTrackingUpdate>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return BelongsTo<User, ShipmentTrackingUpdate>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
