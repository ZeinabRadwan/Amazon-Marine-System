<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * Sales accounts for the CRM / client assignment pipeline.
 */
class SalesTeamUsersSeeder extends Seeder
{
    public function run(): void
    {
        $defaultPassword = 'password';

        $team = [
            ['name' => 'Rasha Shehta', 'email' => 'rasha.shehta@amazonmarine.test', 'initials' => 'RS'],
            ['name' => 'Mostafa Younes', 'email' => 'mostafa.younes@amazonmarine.test', 'initials' => 'MY'],
            ['name' => 'Fayez', 'email' => 'fayez@amazonmarine.test', 'initials' => 'FY'],
            ['name' => 'Sherif Khaled', 'email' => 'sherif.khaled@amazonmarine.test', 'initials' => 'SK'],
            ['name' => 'Diana', 'email' => 'diana@amazonmarine.test', 'initials' => 'DI'],
            ['name' => 'Ali Younes', 'email' => 'ali.younes@amazonmarine.test', 'initials' => 'AY'],
            ['name' => 'Aya Adel', 'email' => 'aya.adel@amazonmarine.test', 'initials' => 'AA'],
        ];

        $salesRole = Role::query()->where('name', 'sales')->where('guard_name', 'web')->first();
        if ($salesRole === null) {
            $this->command?->warn('Sales role missing; run RolesAndPermissionsSeeder first.');

            return;
        }

        foreach ($team as $row) {
            $user = User::firstOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'password' => Hash::make($defaultPassword),
                    'initials' => $row['initials'],
                    'status' => 'active',
                ]
            );

            if ($user->wasRecentlyCreated === false) {
                $user->fill([
                    'name' => $row['name'],
                    'initials' => $row['initials'],
                    'status' => 'active',
                ]);
                if ($user->isDirty()) {
                    $user->save();
                }
            }

            if (! $user->hasRole($salesRole)) {
                $user->syncRoles([$salesRole]);
            }
        }
    }
}
