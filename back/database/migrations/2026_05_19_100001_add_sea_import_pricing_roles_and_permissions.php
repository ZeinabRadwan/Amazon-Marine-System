<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();

        $exportManage = Permission::firstOrCreate(['name' => 'pricing.manage_export_offers', 'guard_name' => 'web']);
        $importManage = Permission::firstOrCreate(['name' => 'pricing.manage_import_offers', 'guard_name' => 'web']);

        $exportRole = Role::firstOrCreate(['name' => 'export_pricing', 'guard_name' => 'web']);
        $exportRole->name_ar = 'التسعير صادر';
        $exportRole->name_en = 'Export Pricing';
        $exportRole->save();
        $exportRole->syncPermissions([
            Permission::firstOrCreate(['name' => 'pricing.view_offers', 'guard_name' => 'web']),
            $exportManage,
        ]);

        $importRole = Role::firstOrCreate(['name' => 'import_pricing', 'guard_name' => 'web']);
        $importRole->name_ar = 'التسعير وارد';
        $importRole->name_en = 'Import Pricing';
        $importRole->save();
        $importRole->syncPermissions([
            Permission::firstOrCreate(['name' => 'pricing.view_offers', 'guard_name' => 'web']),
            $importManage,
        ]);

        if ($pricing = Role::where('name', 'pricing')->first()) {
            $pricing->givePermissionTo([$exportManage, $importManage]);
        }

        $pricingPages = ['dashboard', 'pricing', 'reports', 'attendance', 'settings'];
        foreach (['export_pricing' => $exportRole, 'import_pricing' => $importRole] as $role) {
            foreach ($pricingPages as $page) {
                \App\Models\PagePermission::updateOrCreate(
                    ['role_id' => $role->id, 'page' => $page],
                    ['can_view' => true]
                );
            }
        }
    }

    public function down(): void
    {
        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();

        Role::whereIn('name', ['export_pricing', 'import_pricing'])->delete();
        Permission::whereIn('name', ['pricing.manage_export_offers', 'pricing.manage_import_offers'])->delete();
    }
};
