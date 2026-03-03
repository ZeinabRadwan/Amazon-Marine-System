<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@amazonmarine.test'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('password'),
                'initials' => 'SA',
                'status' => 'active',
            ]
        );

        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        if (! $admin->hasRole($adminRole)) {
            $admin->assignRole($adminRole);
        }
    }
}
