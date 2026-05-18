<?php

use App\Models\PagePermission;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    private const PAGES = ['clients', 'shipments', 'invoices'];

    public function up(): void
    {
        $pricingRole = Role::query()->where('name', 'pricing')->first();
        if (! $pricingRole) {
            return;
        }

        PagePermission::query()
            ->where('role_id', $pricingRole->id)
            ->whereIn('page', self::PAGES)
            ->update(['can_view' => false]);
    }

    public function down(): void
    {
        $pricingRole = Role::query()->where('name', 'pricing')->first();
        if (! $pricingRole) {
            return;
        }

        PagePermission::query()
            ->where('role_id', $pricingRole->id)
            ->whereIn('page', self::PAGES)
            ->update(['can_view' => true]);
    }
};
