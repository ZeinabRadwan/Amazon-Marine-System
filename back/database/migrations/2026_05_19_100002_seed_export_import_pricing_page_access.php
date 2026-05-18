<?php

use App\Models\PagePermission;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        $pages = ['dashboard', 'pricing', 'reports', 'attendance', 'settings'];

        foreach (['export_pricing', 'import_pricing'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if (! $role) {
                continue;
            }
            foreach ($pages as $page) {
                PagePermission::updateOrCreate(
                    ['role_id' => $role->id, 'page' => $page],
                    ['can_view' => true]
                );
            }
        }
    }

    public function down(): void
    {
        foreach (['export_pricing', 'import_pricing'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                PagePermission::where('role_id', $role->id)->delete();
            }
        }
    }
};
