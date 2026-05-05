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

        Schema::table('shipment_cost_invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('shipment_cost_invoices', 'attachment_refs')) {
                $table->json('attachment_refs')->nullable()->after('items');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('shipment_cost_invoices')) {
            return;
        }

        Schema::table('shipment_cost_invoices', function (Blueprint $table) {
            if (Schema::hasColumn('shipment_cost_invoices', 'attachment_refs')) {
                $table->dropColumn('attachment_refs');
            }
        });
    }
};
