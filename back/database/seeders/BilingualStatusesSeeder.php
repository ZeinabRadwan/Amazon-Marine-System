<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Runs all seeders for lookup rows that expose Arabic + English labels
 * (client statuses, ticket statuses, shipment statuses, ticket types/priorities, communication log types).
 */
class BilingualStatusesSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ClientStatusesSeeder::class,
            TicketStatusesSeeder::class,
            ShipmentStatusesSeeder::class,
            TicketTypesAndPrioritiesSeeder::class,
            CommunicationLogTypesSeeder::class,
        ]);
    }
}
