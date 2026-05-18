<?php

namespace App\Observers;

use App\Models\Shipment;
use App\Models\ShipmentStatus;

class ShipmentObserver
{
    /**
     * Handle the Shipment "creating" event.
     */
    public function creating(Shipment $shipment): void
    {
        // Set default status to "New" if not set
        if (! $shipment->status) {
            $newStatus = ShipmentStatus::where('name_en', 'New')->first();
            if ($newStatus) {
                $shipment->status = (string) $newStatus->id;
            } else {
                $shipment->status = 'جديد'; // Fallback to string if not seeded
            }
        }
    }
}
