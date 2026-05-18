<?php

namespace Database\Seeders;

use App\Models\PagePermission;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // reset everything first
        Permission::truncate();
        Role::truncate();
        PagePermission::truncate();
        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();

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
            'export_pricing' => [
                'name_ar' => 'التسعير صادر',
                'name_en' => 'Export Pricing',
            ],
            'import_pricing' => [
                'name_ar' => 'التسعير وارد',
                'name_en' => 'Import Pricing',
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

        // Spatie abilities for pricing module (profile `permissions` array + `$user->can()`).
        if ($pricingRole = $roles['pricing'] ?? null) {
            $pricingRole->syncPermissions([
                $permissions['pricing.view_offers'],
                $permissions['pricing.manage_offers'],
                $permissions['pricing.manage_export_offers'],
                $permissions['pricing.manage_import_offers'],
            ]);
        }

        if ($exportPricingRole = $roles['export_pricing'] ?? null) {
            $exportPricingRole->syncPermissions([
                $permissions['pricing.view_offers'],
                $permissions['pricing.manage_export_offers'],
            ]);
        }

        if ($importPricingRole = $roles['import_pricing'] ?? null) {
            $importPricingRole->syncPermissions([
                $permissions['pricing.view_offers'],
                $permissions['pricing.manage_import_offers'],
            ]);
        }

        if ($salesRole = $roles['sales'] ?? null) {
            $salesRole->syncPermissions([
                $permissions['pricing.view_offers'],
                $permissions['pricing.view_quotes'],
                $permissions['pricing.manage_quotes'],
                $permissions['clients.view'],
                $permissions['clients.create'],
                $permissions['clients.edit'],
                $permissions['clients.manage'],
                $permissions['clients.delete'],
                $permissions['leads.view'],
                $permissions['leads.create'],
                $permissions['leads.edit'],
                $permissions['leads.manage'],
                $permissions['leads.delete'],
            ]);
        }

        if ($salesManagerRole = $roles['sales_manager'] ?? null) {
            $salesManagerRole->syncPermissions([
                $permissions['pricing.view_offers'],
                $permissions['pricing.view_quotes'],
                $permissions['pricing.manage_quotes'],
                $permissions['clients.view'],
                $permissions['clients.create'],
                $permissions['clients.edit'],
                $permissions['clients.manage'],
                $permissions['clients.delete'],
                $permissions['leads.view'],
                $permissions['leads.create'],
                $permissions['leads.edit'],
                $permissions['leads.manage'],
                $permissions['leads.delete'],
            ]);
        }

        if ($operationsRole = $roles['operations'] ?? null) {
            $operationsRole->syncPermissions([
                $permissions['sd_forms.view'],
                $permissions['sd_forms.manage'],
                $permissions['sd_forms.manage_any'],
            ]);
        }

        if ($accountingRole = $roles['accounting'] ?? null) {
            $accountingRole->syncPermissions([
                $permissions['shipments.view'],
                $permissions['accounting.view'],
                $permissions['accounting.manage'],
                $permissions['financial.view'],
                $permissions['financial.manage'],
                $permissions['clients.view'],
                $permissions['leads.view'],
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
            'dashboard',
            'clients',
            'leads',
            'shipments',
            'sd_forms',
            'invoices',
            'accounting',
            'treasury',
            'expenses',
            'pricing',
            'partners',
            'reports',
            'official_documents',
            'customer_service',
            'attendance',
            'visits',
            'users',
            'roles_permissions',
            'settings',
        ];

        $visibilityMatrix = [
            'admin' => collect($pages)->mapWithKeys(fn (string $page): array => [$page => true])->all(),
            'sales_manager' => [
                'dashboard' => true, 'clients' => true, 'leads' => true, 'shipments' => true, 'sd_forms' => true, 'operations' => false,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => true,
                'partners' => false, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'attendance' => true, 'visits' => true, 'users' => false, 'roles_permissions' => false, 'settings' => true,
            ],
            'sales' => [
                'dashboard' => true, 'clients' => true, 'leads' => true, 'shipments' => true, 'sd_forms' => true, 'operations' => false,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => true,
                'partners' => false, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'attendance' => true, 'visits' => true, 'users' => false, 'roles_permissions' => false, 'settings' => true,
            ],
            'accounting' => [
                'dashboard' => true, 'clients' => true, 'leads' => true, 'shipments' => true, 'sd_forms' => false, 'operations' => false,
                'invoices' => true, 'accounting' => true, 'treasury' => true, 'expenses' => true, 'pricing' => false,
                'partners' => true, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'attendance' => true, 'visits' => false, 'users' => false, 'roles_permissions' => false, 'settings' => true,
            ],
            'pricing' => [
                'dashboard' => true, 'clients' => false, 'shipments' => false, 'sd_forms' => false, 'operations' => false,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => true,
                'partners' => false, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'attendance' => true, 'visits' => false, 'users' => false, 'roles_permissions' => false, 'settings' => true,
            ],
            'export_pricing' => [
                'dashboard' => true, 'clients' => false, 'shipments' => false, 'sd_forms' => false, 'operations' => false,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => true,
                'partners' => false, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'attendance' => true, 'visits' => false, 'users' => false, 'roles_permissions' => false, 'settings' => true,
            ],
            'import_pricing' => [
                'dashboard' => true, 'clients' => false, 'shipments' => false, 'sd_forms' => false, 'operations' => false,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => true,
                'partners' => false, 'reports' => true, 'official_documents' => false, 'customer_service' => false,
                'attendance' => true, 'visits' => false, 'users' => false, 'roles_permissions' => false, 'settings' => true,
            ],
            'operations' => [
                'dashboard' => true, 'clients' => false, 'shipments' => true, 'sd_forms' => true, 'operations' => true,
                'invoices' => false, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => false,
                'partners' => false, 'reports' => false, 'official_documents' => false, 'customer_service' => false,
                'attendance' => true, 'visits' => false, 'users' => false, 'roles_permissions' => false, 'settings' => true,
            ],
            'support' => [
                'dashboard' => true, 'clients' => true, 'leads' => true, 'shipments' => true, 'sd_forms' => false, 'operations' => false,
                'invoices' => true, 'accounting' => false, 'treasury' => false, 'expenses' => false, 'pricing' => false,
                'partners' => false, 'reports' => false, 'official_documents' => false, 'customer_service' => true,
                'attendance' => true, 'visits' => true, 'users' => false, 'roles_permissions' => false, 'settings' => true,
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
