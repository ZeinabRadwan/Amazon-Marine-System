<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class RoleUsersSeeder extends Seeder
{
    public function run(): void
    {
        $defaultPassword = 'password';

        $seed = [
            'admin' => [
                'email' => 'admin@amazonmarine.test',
                'name' => 'System Admin',
                'initials' => 'SA',
            ],
            'sales_manager' => [
                'email' => 'sales.manager@amazonmarine.test',
                'name' => 'Sales Manager',
                'initials' => 'SM',
            ],
            'sales' => [
                'email' => 'sales@amazonmarine.test',
                'name' => 'Sales Employee',
                'initials' => 'SE',
            ],
            'accounting' => [
                'email' => 'accounting@amazonmarine.test',
                'name' => 'Accountant',
                'initials' => 'AC',
            ],
            'pricing' => [
                'email' => 'pricing@amazonmarine.test',
                'name' => 'Pricing Team',
                'initials' => 'PT',
            ],
            'operations' => [
                'email' => 'operations@amazonmarine.test',
                'name' => 'Operations Employee',
                'initials' => 'OE',
            ],
            'support' => [
                'email' => 'support@amazonmarine.test',
                'name' => 'Support Employee',
                'initials' => 'SU',
            ],
        ];

        foreach ($seed as $roleName => $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make($defaultPassword),
                    'initials' => $data['initials'],
                    'status' => 'active',
                ]
            );

            $role = Role::firstOrCreate(['name' => $roleName], ['guard_name' => 'web']);
            if (! $user->hasRole($role)) {
                $user->syncRoles([$role]);
            }
        }
    }
}

