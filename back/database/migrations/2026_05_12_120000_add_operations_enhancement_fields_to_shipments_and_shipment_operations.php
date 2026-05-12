<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('operational_status_code', 80)->nullable()->after('operations_status');
        });

        Schema::table('shipment_operations', function (Blueprint $table) {
            $table->json('service_types')->nullable()->after('shipment_id');
            $table->date('ops_loading_date')->nullable()->after('eta');
            $table->text('transport_instructions')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn('operational_status_code');
        });

        Schema::table('shipment_operations', function (Blueprint $table) {
            $table->dropColumn(['service_types', 'ops_loading_date', 'transport_instructions']);
        });
    }
};
