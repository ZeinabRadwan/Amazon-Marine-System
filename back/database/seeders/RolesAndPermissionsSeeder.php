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
        app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $permissionGroups = config('permissions.groups', []);
        $allPermissionNames = collect($permissionGroups)->flatten()->unique()->values()->all();

        $permissions = collect($allPermissionNames)->mapWithKeys(function (string $permKey): array {
            return [$permKey => Permission::firstOrCreate(['name' => $permKey])];
        });

        $roleKeys = [
            'admin',
            'sales',
            'sales_supervisor',
            'sales_manager',
            'accounting',
            'pricing',
            'operation',
            'support',
        ];

        $roles = collect($roleKeys)
            ->mapWithKeys(function (string $roleKey): array {
                return [$roleKey => Role::firstOrCreate(['name' => $roleKey])];
            })
            ->all();

        if ($admin = $roles['admin'] ?? null) {
            $admin->syncPermissions($permissions->values());
        }

        if ($sales = $roles['sales'] ?? null) {
            $sales->syncPermissions([
                $permissions['clients.view'],
                $permissions['clients.manage'],
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
                $permissions['shipments.view_own'],
            ]);
        }

        if ($salesSupervisor = $roles['sales_supervisor'] ?? null) {
            $salesSupervisor->syncPermissions([
                $permissions['clients.view'],
                $permissions['clients.manage'],
                $permissions['clients.delete'],
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
                $permissions['sd_forms.manage_any'],
                $permissions['shipments.view_own'],
                $permissions['reports.view'],
            ]);
        }

        if ($salesManager = $roles['sales_manager'] ?? null) {
            $salesManager->syncPermissions([
                $permissions['clients.view'],
                $permissions['clients.manage'],
                $permissions['clients.delete'],
                $permissions['users.view'],
                $permissions['users.manage'],
                $permissions['users.manage_admins'],
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
                $permissions['sd_forms.manage_any'],
                $permissions['shipments.view_own'],
                $permissions['reports.view'],
            ]);
        }

        if ($operation = $roles['operation'] ?? null) {
            $operation->syncPermissions([
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
                $permissions['shipments.view'],
                $permissions['shipments.manage_ops'],
            ]);
        }

        if ($accounting = $roles['accounting'] ?? null) {
            $accounting->syncPermissions([
                $permissions['accounting.view'],
                $permissions['accounting.manage'],
                $permissions['financial.view'],
                $permissions['financial.manage'],
            ]);
        }

        if ($pricing = $roles['pricing'] ?? null) {
            $pricing->syncPermissions([
                $permissions['pricing.view_offers'],
                $permissions['pricing.manage_offers'],
                $permissions['pricing.view_client_pricing'],
                $permissions['pricing.manage_client_pricing'],
                $permissions['clients.view'],
            ]);
        }

        if ($support = $roles['support'] ?? null) {
            $support->syncPermissions([
                $permissions['clients.view'],
                $permissions['tickets.view'],
                $permissions['tickets.manage'],
                $permissions['customer_service.view_comms'],
                $permissions['customer_service.manage_comms'],
                $permissions['customer_service.view_tracking_updates'],
                $permissions['customer_service.manage_tracking_updates'],
            ]);
        }

        $this->seedPagePermissions($roles);
    }

    /**
     * @param  array<string, Role>  $roles
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

        if ($salesSupervisor = $roles['sales_supervisor'] ?? null) {
            PagePermission::updateOrCreate(
                [
                    'role_id' => $salesSupervisor->id,
                    'page' => 'clients',
                ],
                [
                    'can_view' => true,
                    'can_edit' => true,
                    'can_delete' => true,
                    'can_approve' => false,
                ],
            );
        }

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
