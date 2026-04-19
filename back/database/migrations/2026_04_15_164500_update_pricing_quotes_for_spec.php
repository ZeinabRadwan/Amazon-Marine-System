<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->json('available_sailing_days')->nullable()->after('notes');
            $table->unsignedInteger('weekly_sailings')->nullable()->after('available_sailing_days');
        });
    }

    public function down(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->dropColumn(['available_sailing_days', 'weekly_sailings']);
        });
    }
};
