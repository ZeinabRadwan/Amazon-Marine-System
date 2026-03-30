<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table) {
            $table->string('shipping_line', 255)->nullable()->after('pod_id');
        });
    }

    public function down(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table) {
            $table->dropColumn('shipping_line');
        });
    }
};
