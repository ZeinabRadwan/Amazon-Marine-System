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
        Schema::table('pricing_offers', function (Blueprint $table) {
            $table->string('container_type', 20)->nullable()->after('pricing_type'); // Dry / Reefer
            $table->string('container_size', 20)->nullable()->after('container_type'); // 20 / 40
            $table->string('container_height', 20)->nullable()->after('container_size'); // Standard / HQ
            $table->string('free_time')->nullable()->after('transit_time');
            $table->date('valid_from')->nullable()->after('valid_to');
            $table->json('available_sailing_days')->nullable()->after('notes'); // Array of week days
            $table->unsignedInteger('weekly_sailings')->nullable()->after('available_sailing_days');
        });

        Schema::table('pricing_offer_items', function (Blueprint $table) {
            $table->string('name', 120)->nullable()->after('code');
            $table->string('description')->nullable()->after('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pricing_offers', function (Blueprint $table) {
            $table->dropColumn([
                'container_type',
                'container_size',
                'container_height',
                'free_time',
                'valid_from',
                'available_sailing_days',
                'weekly_sailings'
            ]);
        });

        Schema::table('pricing_offer_items', function (Blueprint $table) {
            $table->dropColumn(['name', 'description']);
        });
    }
};
