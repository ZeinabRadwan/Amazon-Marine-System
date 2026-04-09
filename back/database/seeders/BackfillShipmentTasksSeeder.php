<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\ShipmentOperationTask;
use Illuminate\Database\Seeder;

class BackfillShipmentTasksSeeder extends Seeder
{
    public function run(): void
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

        Shipment::chunk(100, function ($shipments) use ($defaultTasks) {
            foreach ($shipments as $shipment) {
                if ($shipment->tasks()->count() === 0) {
                    foreach ($defaultTasks as $index => $taskName) {
                        ShipmentOperationTask::create([
                            'shipment_id' => $shipment->id,
                            'name' => __($taskName),
                            'sort_order' => ($index + 1),
                            'status' => 'pending',
                        ]);
                    }
                }
            }
        });
    }
}
