<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table) {
            $table->foreignId('shipping_line_id')->nullable()->after('shipping_line')->constrained('shipping_lines')->nullOnDelete();
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->foreignId('shipping_line_id')->nullable()->after('line_vendor_id')->constrained('shipping_lines')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('shipping_line_id');
        });

        Schema::table('s_d_forms', function (Blueprint $table) {
            $table->dropConstrainedForeignId('shipping_line_id');
        });
    }
};
