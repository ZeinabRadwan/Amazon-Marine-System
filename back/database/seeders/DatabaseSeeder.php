<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            AdminUserSeeder::class,
            BilingualStatusesSeeder::class,
            ClientLookupsSeeder::class,
            VendorPartnerTypesSeeder::class,
            ClientsSeeder::class,
            PortsSeeder::class,
            SDFormLookupsSeeder::class,
            SDFormsSeeder::class,
            ExpensesSeeder::class,
            InvoicesSeeder::class,
            CustomerServiceSeeder::class,
            PricingSeeder::class,
            ClientStatusesSeeder::class,
        ]);
    }
}
