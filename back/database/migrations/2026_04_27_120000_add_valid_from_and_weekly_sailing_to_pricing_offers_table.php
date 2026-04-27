<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_offers', function (Blueprint $table) {
            $table->date('valid_from')->nullable()->after('inland_city');
            $table->string('weekly_sailing_days', 255)->nullable()->after('valid_from');
        });
    }

    public function down(): void
    {
        Schema::table('pricing_offers', function (Blueprint $table) {
            $table->dropColumn(['valid_from', 'weekly_sailing_days']);
        });
    }
};
