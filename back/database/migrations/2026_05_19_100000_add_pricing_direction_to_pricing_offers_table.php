<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_offers', function (Blueprint $table): void {
            $table->string('pricing_direction', 16)->default('export')->after('pricing_type');
            $table->index(['pricing_type', 'pricing_direction']);
        });
    }

    public function down(): void
    {
        Schema::table('pricing_offers', function (Blueprint $table): void {
            $table->dropIndex(['pricing_type', 'pricing_direction']);
            $table->dropColumn('pricing_direction');
        });
    }
};
