<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Grant the operations role view/manage access to SD forms so they can
     * see and work on forms that sales has sent to operations.
     */
    public function up(): void
    {
        $operationsRole = Role::where('name', 'operations')->first();
        if (! $operationsRole) {
            return;
        }

        DB::table('page_permissions')->updateOrInsert(
            ['role_id' => $operationsRole->id, 'page' => 'sd_forms'],
            [
                'can_view' => true,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        foreach (['sd_forms.view', 'sd_forms.manage', 'sd_forms.manage_any'] as $name) {
            $permission = Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            if (! $operationsRole->hasPermissionTo($permission)) {
                $operationsRole->givePermissionTo($permission);
            }
        }

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Revert the operations role's access to SD forms.
     */
    public function down(): void
    {
        $operationsRole = Role::where('name', 'operations')->first();
        if (! $operationsRole) {
            return;
        }

        DB::table('page_permissions')
            ->where('role_id', $operationsRole->id)
            ->where('page', 'sd_forms')
            ->update(['can_view' => false, 'updated_at' => now()]);

        foreach (['sd_forms.view', 'sd_forms.manage', 'sd_forms.manage_any'] as $name) {
            $permission = Permission::where(['name' => $name, 'guard_name' => 'web'])->first();
            if ($permission && $operationsRole->hasPermissionTo($permission)) {
                $operationsRole->revokePermissionTo($permission);
            }
        }

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
