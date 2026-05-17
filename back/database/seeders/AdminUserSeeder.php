<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * Creates the initial system admin (run after RolesAndPermissionsSeeder).
 *
 * Env (optional): ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_INITIALS
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = (string) env('ADMIN_EMAIL', 'admin@amazonmarine.test');
        $name = (string) env('ADMIN_NAME', 'System Admin');
        $initials = (string) env('ADMIN_INITIALS', 'SA');
        $password = (string) env('ADMIN_PASSWORD', 'password');

        $adminRole = Role::query()
            ->where('name', 'admin')
            ->where('guard_name', 'web')
            ->first();

        if ($adminRole === null) {
            $this->command?->warn('Admin role missing — run RolesAndPermissionsSeeder first.');

            return;
        }

        $admin = User::query()->where('email', $email)->first();

        if ($admin === null) {
            $admin = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'initials' => $initials,
                'status' => 'active',
            ]);
        } else {
            $admin->fill([
                'name' => $name,
                'initials' => $initials,
                'status' => 'active',
            ]);
            if ($password !== '') {
                $admin->password = $password;
            }
            $admin->save();
        }

        $admin->syncRoles([$adminRole]);

        $this->command?->info("Admin user ready: {$email}");
    }
}
