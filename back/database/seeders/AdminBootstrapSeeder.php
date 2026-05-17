<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Roles + admin only — use when you need to (re)create the admin account without full db:seed.
 *
 *   php artisan db:seed --class=AdminBootstrapSeeder
 */
class AdminBootstrapSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            AdminUserSeeder::class,
        ]);
    }
}
