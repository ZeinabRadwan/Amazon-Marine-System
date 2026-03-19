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
            ClientLookupsSeeder::class,
            ClientsSeeder::class,
            SDFormsSeeder::class,
            ExpensesSeeder::class,
            InvoicesSeeder::class,
            TicketTypesAndPrioritiesSeeder::class,
            CommunicationLogTypesSeeder::class,
            CustomerServiceSeeder::class,
            TicketStatusesSeeder::class,
            ShipmentStatusesSeeder::class,
        ]);
    }
}
