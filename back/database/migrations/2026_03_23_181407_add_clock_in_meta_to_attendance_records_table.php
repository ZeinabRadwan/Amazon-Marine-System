<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->string('clock_in_device_type', 20)->nullable()->after('worked_minutes');
            $table->decimal('clock_in_distance_from_office', 12, 2)->nullable()->after('clock_in_device_type');
            $table->boolean('clock_in_is_within_radius')->nullable()->after('clock_in_distance_from_office');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn([
                'clock_in_device_type',
                'clock_in_distance_from_office',
                'clock_in_is_within_radius',
            ]);
        });
    }
};
