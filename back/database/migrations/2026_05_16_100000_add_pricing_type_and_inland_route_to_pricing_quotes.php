<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->string('pricing_type', 20)->default('sea')->after('pricing_offer_id');
            $table->string('inland_port')->nullable()->after('pod');
            $table->string('inland_address')->nullable()->after('municipality');
            $table->index(['pricing_type']);
        });
    }

    public function down(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->dropIndex(['pricing_type']);
            $table->dropColumn(['pricing_type', 'inland_port', 'inland_address']);
        });
    }
};
