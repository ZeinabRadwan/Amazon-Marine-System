<?php

namespace Database\Seeders;

use App\Models\PagePermission;
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

        $roles = collect($roleKeys)
            ->mapWithKeys(function (string $roleKey): array {
                return [$roleKey => Role::firstOrCreate(['name' => $roleKey])];
            })
            ->all();

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
            'accounting' => [
                'accounting.view',
                'accounting.manage',
            ],
            'reports' => [
                'reports.view',
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
            ]);
        }

        if ($salesManager = $roles['sales_manager'] ?? null) {
            $salesManager->syncPermissions([
                $permissions['clients.view'],
                $permissions['clients.manage'],
                $permissions['users.view'],
                $permissions['users.manage'],
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
            ]);
        }

        if ($operation = $roles['operation'] ?? null) {
            $operation->syncPermissions([
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
            ]);
        }

        if ($accounting = $roles['accounting'] ?? null) {
            $accounting->syncPermissions([
                $permissions['accounting.view'],
                $permissions['accounting.manage'],
            ]);
        }

        if ($pricing = $roles['pricing'] ?? null) {
            $pricing->syncPermissions([]);
        }

        if ($support = $roles['support'] ?? null) {
            $support->syncPermissions([
                $permissions['clients.view'],
            ]);
        }

        // Seed page-level permissions for core modules
        $this->seedPagePermissions($roles);
    }

    /**
     * @param array<string, Role> $roles
     */
    protected function seedPagePermissions(array $roles): void
    {
        $pages = [
            'auth',
            'users',
            'roles',
            'permissions',
            'clients',
        ];

        // Admin: full access to all pages
        if ($admin = $roles['admin'] ?? null) {
            foreach ($pages as $page) {
                PagePermission::updateOrCreate(
                    [
                        'role_id' => $admin->id,
                        'page' => $page,
                    ],
                    [
                        'can_view' => true,
                        'can_edit' => true,
                        'can_delete' => true,
                        'can_approve' => true,
                    ],
                );
            }
        }

        // Sales: full access to clients page
        if ($sales = $roles['sales'] ?? null) {
            PagePermission::updateOrCreate(
                [
                    'role_id' => $sales->id,
                    'page' => 'clients',
                ],
                [
                    'can_view' => true,
                    'can_edit' => true,
                    'can_delete' => false,
                    'can_approve' => false,
                ],
            );
        }

        // Sales manager: manage clients and users
        if ($salesManager = $roles['sales_manager'] ?? null) {
            PagePermission::updateOrCreate(
                [
                    'role_id' => $salesManager->id,
                    'page' => 'clients',
                ],
                [
                    'can_view' => true,
                    'can_edit' => true,
                    'can_delete' => true,
                    'can_approve' => true,
                ],
            );

            PagePermission::updateOrCreate(
                [
                    'role_id' => $salesManager->id,
                    'page' => 'users',
                ],
                [
                    'can_view' => true,
                    'can_edit' => true,
                    'can_delete' => false,
                    'can_approve' => false,
                ],
            );
        }

        // Support: view-only access to clients
        if ($support = $roles['support'] ?? null) {
            PagePermission::updateOrCreate(
                [
                    'role_id' => $support->id,
                    'page' => 'clients',
                ],
                [
                    'can_view' => true,
                    'can_edit' => false,
                    'can_delete' => false,
                    'can_approve' => false,
                ],
            );
        }
    }
}
