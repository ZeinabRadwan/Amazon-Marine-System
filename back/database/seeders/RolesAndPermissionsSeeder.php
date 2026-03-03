<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define core roles
        $roleKeys = [
            'admin',
            'sales',
            'accounting',
            'pricing',
            'operation',
            'support',
            'sales_manager',
        ];

        $roles = collect($roleKeys)->mapWithKeys(function (string $roleKey) {
            return [$roleKey => Role::firstOrCreate(['name' => $roleKey])];
        });

        // Define permissions grouped by domain
        $permissionGroups = [
            'users' => [
                'users.view',
                'users.manage',
            ],
            'roles' => [
                'roles.view',
                'roles.manage',
                'permissions.view',
                'permissions.manage',
            ],
            'clients' => [
                'clients.view',
                'clients.manage',
            ],
            'sd_forms' => [
                'sd_forms.view',
                'sd_forms.manage',
            ],
            'shipments' => [
                'shipments.view',
                'shipments.manage_ops',
            ],
            'financial' => [
                'financial.view',
                'financial.manage',
            ],
            'reports' => [
                'reports.view',
            ],
            'support' => [
                'tickets.view',
                'tickets.manage',
                'notes.view',
                'notes.manage',
            ],
        ];

        $allPermissionNames = collect($permissionGroups)->flatten()->unique();

        $permissions = $allPermissionNames->mapWithKeys(function (string $permKey) {
            return [$permKey => Permission::firstOrCreate(['name' => $permKey])];
        });

        // Assign permissions per role (can be refined later)
        if ($admin = $roles['admin'] ?? null) {
            $admin->syncPermissions($permissions->values());
        }

        if ($sales = $roles['sales'] ?? null) {
            $sales->syncPermissions([
                $permissions['clients.view'],
                $permissions['clients.manage'],
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
                $permissions['shipments.view'],
                $permissions['reports.view'],
            ]);
        }

        if ($salesManager = $roles['sales_manager'] ?? null) {
            $salesManager->syncPermissions([
                $permissions['clients.view'],
                $permissions['clients.manage'],
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
                $permissions['shipments.view'],
                $permissions['reports.view'],
                $permissions['users.view'],
                $permissions['users.manage'],
            ]);
        }

        if ($operation = $roles['operation'] ?? null) {
            $operation->syncPermissions([
                $permissions['shipments.view'],
                $permissions['shipments.manage_ops'],
                $permissions['sd_forms.view'],
                $permissions['reports.view'],
            ]);
        }

        if ($accounting = $roles['accounting'] ?? null) {
            $accounting->syncPermissions([
                $permissions['financial.view'],
                $permissions['financial.manage'],
                $permissions['shipments.view'],
                $permissions['reports.view'],
            ]);
        }

        if ($pricing = $roles['pricing'] ?? null) {
            $pricing->syncPermissions([
                $permissions['shipments.view'],
                $permissions['reports.view'],
            ]);
        }

        if ($support = $roles['support'] ?? null) {
            $support->syncPermissions([
                $permissions['clients.view'],
                $permissions['sd_forms.view'],
                $permissions['shipments.view'],
                $permissions['reports.view'],
            ]);
        }
    }
}
