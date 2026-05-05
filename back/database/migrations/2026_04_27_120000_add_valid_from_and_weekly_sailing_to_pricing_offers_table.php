<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('pricing_offers', 'valid_from')) {
            Schema::table('pricing_offers', function (Blueprint $table) {
                $table->date('valid_from')->nullable()->after('inland_city');
            });
        }

        if (! Schema::hasColumn('pricing_offers', 'weekly_sailing_days')) {
            Schema::table('pricing_offers', function (Blueprint $table) {
                $table->string('weekly_sailing_days', 255)->nullable()->after('valid_from');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pricing_offers', 'weekly_sailing_days')) {
            Schema::table('pricing_offers', function (Blueprint $table) {
                $table->dropColumn('weekly_sailing_days');
            });
        }
        if (Schema::hasColumn('pricing_offers', 'valid_from')) {
            Schema::table('pricing_offers', function (Blueprint $table) {
                $table->dropColumn('valid_from');
            });
        }
    }
};
