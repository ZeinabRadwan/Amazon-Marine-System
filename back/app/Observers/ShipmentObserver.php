<?php

namespace App\Observers;

use App\Models\Shipment;
use App\Models\ShipmentOperationTask;

class ShipmentObserver
{
    /**
     * Handle the Shipment "created" event.
     */
    public function created(Shipment $shipment): void
    {
        $defaultTasks = [
            'Review Client Documents',
            'Review Packing List & Invoice',
            'Review Sticker',
            'Open Customs Certificate',
            'Allocate Shipping Order (D.O.)',
            'Container Withdrawal/Pulling',
            'Submit SI & VGM',
            'Review Draft B/L',
            'Prepare Certificate of Origin / Agricultural (if applicable)',
            'Stamp Customs Documents',
        ];

        foreach ($defaultTasks as $index => $taskName) {
            ShipmentOperationTask::create([
                'shipment_id' => $shipment->id,
                'name' => $taskName,
                'sort_order' => ($index + 1),
                'status' => 'pending',
                'assigned_to_id' => null,
                'due_date' => null,
            ]);
        }
    }
}
