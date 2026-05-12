<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipment_operations', function (Blueprint $table) {
            $table->json('transport_instruction_profile')->nullable()->after('transport_instructions');
        });
    }

    public function down(): void
    {
        Schema::table('shipment_operations', function (Blueprint $table) {
            $table->dropColumn('transport_instruction_profile');
        });
    }
};
