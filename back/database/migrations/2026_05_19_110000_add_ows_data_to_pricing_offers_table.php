<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_offers', function (Blueprint $table): void {
            $table->json('ows_data')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('pricing_offers', function (Blueprint $table): void {
            $table->dropColumn('ows_data');
        });
    }
};
