<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Grant the accounting role read access to shipments and financial/accounting APIs
     * so كشف الحساب and partner statements can resolve shipment-linked records.
     */
    public function up(): void
    {
        $accountingRole = Role::where('name', 'accounting')->first();
        if (! $accountingRole) {
            return;
        }

        foreach ([
            'shipments.view',
            'accounting.view',
            'accounting.manage',
            'financial.view',
            'financial.manage',
            'clients.view',
        ] as $name) {
            $permission = Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            if (! $accountingRole->hasPermissionTo($permission)) {
                $accountingRole->givePermissionTo($permission);
            }
        }

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $accountingRole = Role::where('name', 'accounting')->first();
        if (! $accountingRole) {
            return;
        }

        foreach ([
            'shipments.view',
            'accounting.view',
            'accounting.manage',
            'financial.view',
            'financial.manage',
            'clients.view',
        ] as $name) {
            $permission = Permission::where(['name' => $name, 'guard_name' => 'web'])->first();
            if ($permission && $accountingRole->hasPermissionTo($permission)) {
                $accountingRole->revokePermissionTo($permission);
            }
        }

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
