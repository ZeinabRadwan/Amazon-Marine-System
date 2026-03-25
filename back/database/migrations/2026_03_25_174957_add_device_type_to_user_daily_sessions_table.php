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
        Schema::table('user_daily_sessions', function (Blueprint $table) {
            $table->string('device_type', 20)->nullable()->after('total_active_seconds');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_daily_sessions', function (Blueprint $table) {
            $table->dropColumn('device_type');
        });
    }
};
