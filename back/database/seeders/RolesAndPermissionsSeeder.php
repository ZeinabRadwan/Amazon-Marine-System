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

        $rolesSeed = [
            'admin' => [
                'name_ar' => 'مدير النظام',
                'name_en' => 'System Manager',
            ],
            'sales_manager' => [
                'name_ar' => 'مدير المبيعات',
                'name_en' => 'Sales Manager',
            ],
            'sales' => [
                'name_ar' => 'موظف مبيعات',
                'name_en' => 'Sales Employee',
            ],
            'accounting' => [
                'name_ar' => 'المحاسب',
                'name_en' => 'Accountant',
            ],
            'pricing' => [
                'name_ar' => 'فريق التسعير',
                'name_en' => 'Pricing Team',
            ],
            'operations' => [
                'name_ar' => 'موظف العمليات',
                'name_en' => 'Operations Employee',
            ],
            'support' => [
                'name_ar' => 'موظف دعم فني',
                'name_en' => 'Support Employee',
            ],
        ];

        $roles = collect($rolesSeed)
            ->mapWithKeys(function (array $roleData, string $roleKey): array {
                $role = Role::firstOrCreate(['name' => $roleKey], ['guard_name' => 'web']);
                $role->name_ar = $roleData['name_ar'];
                $role->name_en = $roleData['name_en'];
                $role->save();

                return [$roleKey => $role];
            })
            ->all();

        if ($admin = $roles['admin'] ?? null) {
            $admin->syncPermissions($permissions->values());
        }

        collect($roles)->except('admin')->each(function (Role $role): void {
            $role->syncPermissions([]);
        });

        $this->seedPagePermissions($roles);
    }

    /**
     * @param  array<string, Role>  $roles
     */
    protected function seedPagePermissions(array $roles): void
    {
        $pages = [
            'dashboard',
            'clients',
            'shipments',
            'sd_forms',
            'operations',
            'invoices',
            'accounting',
            'treasury',
            'expenses',
            'pricing',
            'partners',
            'reports',
            'official_documents',
            'customer_service',
            'support_tickets',
            'team_performance',
            'attendance',
            'visits',
            'settings',
            'profile',
            'cost_viewer',
        ];

        $visibilityMatrix = [
            'admin' => collect($pages)->mapWithKeys(fn (string $page): array => [$page => $page !== 'team_performance'])->all(),
            'sales_manager' => [
                'dashboard' => true, 'clients' => true, 'shipments' => true, 'sd_forms' => true, 'operations' => false,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => false,
                'partners' => false, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'support_tickets' => false, 'team_performance' => true, 'attendance' => true, 'visits' => true,
                'settings' => true, 'profile' => true, 'cost_viewer' => false,
            ],
            'sales' => [
                'dashboard' => true, 'clients' => true, 'shipments' => true, 'sd_forms' => true, 'operations' => false,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => true,
                'partners' => false, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'support_tickets' => false, 'team_performance' => false, 'attendance' => true, 'visits' => true,
                'settings' => true, 'profile' => true, 'cost_viewer' => false,
            ],
            'accounting' => [
                'dashboard' => true, 'clients' => true, 'shipments' => true, 'sd_forms' => false, 'operations' => false,
                'invoices' => true, 'accounting' => true, 'treasury' => true, 'expenses' => true, 'pricing' => false,
                'partners' => true, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'support_tickets' => false, 'team_performance' => false, 'attendance' => true, 'visits' => false,
                'settings' => true, 'profile' => true, 'cost_viewer' => false,
            ],
            'pricing' => [
                'dashboard' => true, 'clients' => true, 'shipments' => true, 'sd_forms' => false, 'operations' => false,
                'invoices' => true, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => true,
                'partners' => false, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'support_tickets' => false, 'team_performance' => false, 'attendance' => true, 'visits' => false,
                'settings' => true, 'profile' => true, 'cost_viewer' => true,
            ],
            'operations' => [
                'dashboard' => true, 'clients' => false, 'shipments' => true, 'sd_forms' => false, 'operations' => true,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => false,
                'partners' => false, 'reports' => false, 'official_documents' => false, 'customer_service' => false,
                'support_tickets' => false, 'team_performance' => false, 'attendance' => true, 'visits' => false,
                'settings' => true, 'profile' => true, 'cost_viewer' => false,
            ],
            'support' => [
                'dashboard' => true, 'clients' => true, 'shipments' => true, 'sd_forms' => false, 'operations' => false,
                'invoices' => true, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => false,
                'partners' => false, 'reports' => false, 'official_documents' => false, 'customer_service' => true,
                'support_tickets' => true, 'team_performance' => false, 'attendance' => true, 'visits' => true,
                'settings' => true, 'profile' => true, 'cost_viewer' => false,
            ],
        ];

        foreach ($visibilityMatrix as $roleKey => $rolePages) {
            $role = $roles[$roleKey] ?? null;
            if (! $role) {
                continue;
            }

            foreach ($pages as $page) {
                PagePermission::updateOrCreate(
                    [
                        'role_id' => $role->id,
                        'page' => $page,
                    ],
                    [
                        'can_view' => (bool) ($rolePages[$page] ?? false),
                    ],
                );
            }
        }
    }
}
