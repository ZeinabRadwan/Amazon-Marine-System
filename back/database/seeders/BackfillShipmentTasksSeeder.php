<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * @deprecated Shipment operation tasks are created manually from the Operations tab only.
 *             This seeder is intentionally a no-op (legacy backfill removed).
 */
class BackfillShipmentTasksSeeder extends Seeder
{
    public function run(): void
    {
        // Intentionally empty — do not auto-create default tasks on shipments.
    }
}
