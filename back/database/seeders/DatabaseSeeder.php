<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Production bootstrap only — roles, admin user, lookups, and system reference data.
 *
 * Does not seed demo clients, shipments, quotes, invoices, expenses, or sample transactions.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            AdminUserSeeder::class,
            BilingualStatusesSeeder::class,
            ShipmentOperationalStatusesSeeder::class,
            ClientLookupsSeeder::class,
            VendorPartnerTypesSeeder::class,
            PortsSeeder::class,
            ShippingLineSeeder::class,
            SDFormLookupsSeeder::class,
            PricingFreightUnitTypesSeeder::class,
        ]);
    }
}
