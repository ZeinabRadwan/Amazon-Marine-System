<?php

namespace Database\Seeders;

use App\Models\Shipment;
use App\Models\ShipmentStatus;
use Illuminate\Database\Seeder;

class CleanShipmentStatusesSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure all statuses are in the DB (Run the main seeder first)
        $this->call(ShipmentStatusesSeeder::class);

        $statuses = ShipmentStatus::all();

        // 2. Map of common string variations to the correct Name or ID
        $variations = [
            'تم الحجز' => 'Booking Confirmed',
            'Backfill' => 'Booking Confirmed',
            'New' => 'New',
        ];

        Shipment::chunk(100, function ($shipments) use ($statuses, $variations) {
            foreach ($shipments as $shipment) {
                $current = trim((string)$shipment->status);
                if (!$current) continue;

                // If already an ID that exists, skip
                if (is_numeric($current) && $statuses->firstWhere('id', $current)) {
                    continue;
                }

                // Check variations
                $targetName = $variations[$current] ?? $current;

                // Try to find by English or Arabic name
                $found = $statuses->filter(function($s) use ($targetName) {
                    return strtolower($s->name_en) === strtolower($targetName) 
                        || $s->name_ar === $targetName;
                })->first();

                if ($found) {
                    $shipment->status = (string)$found->id;
                    $shipment->save();
                }
            }
        });
    }
}
