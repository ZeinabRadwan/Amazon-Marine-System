<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->boolean('quick_mode')->default(false)->after('origin_rate_snapshot_id');
            $table->string('quick_mode_reason', 255)->nullable()->after('quick_mode');
            $table->json('container_spec')->nullable()->after('container_type');
            $table->json('free_time_data')->nullable()->after('free_time');
            $table->string('schedule_type', 20)->nullable()->after('free_time_data');
            $table->json('sailing_weekdays')->nullable()->after('schedule_type');
        });
    }

    public function down(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->dropColumn([
                'quick_mode',
                'quick_mode_reason',
                'container_spec',
                'free_time_data',
                'schedule_type',
                'sailing_weekdays',
            ]);
        });
    }
};

