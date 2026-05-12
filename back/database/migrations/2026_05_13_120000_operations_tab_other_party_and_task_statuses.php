<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipment_operations', function (Blueprint $table) {
            $table->string('other_party_name', 255)->nullable()->after('overseas_agent_id');
            $table->text('other_party_role')->nullable()->after('other_party_name');
        });

        DB::table('shipment_operation_tasks')->where('status', 'done')->update(['status' => 'completed']);
        DB::table('shipment_operation_tasks')->where('status', 'in_progress')->update(['status' => 'pending']);
    }

    public function down(): void
    {
        Schema::table('shipment_operations', function (Blueprint $table) {
            $table->dropColumn(['other_party_name', 'other_party_role']);
        });

        DB::table('shipment_operation_tasks')->where('status', 'completed')->update(['status' => 'done']);
    }
};
