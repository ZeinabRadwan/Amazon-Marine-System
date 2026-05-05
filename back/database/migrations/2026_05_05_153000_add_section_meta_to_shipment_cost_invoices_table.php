<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('shipment_cost_invoices')) {
            return;
        }
        if (! Schema::hasColumn('shipment_cost_invoices', 'section_meta')) {
            Schema::table('shipment_cost_invoices', function (Blueprint $table) {
                $table->json('section_meta')->nullable()->after('attachment_refs');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('shipment_cost_invoices')) {
            return;
        }
        if (Schema::hasColumn('shipment_cost_invoices', 'section_meta')) {
            Schema::table('shipment_cost_invoices', function (Blueprint $table) {
                $table->dropColumn('section_meta');
            });
        }
    }
};
