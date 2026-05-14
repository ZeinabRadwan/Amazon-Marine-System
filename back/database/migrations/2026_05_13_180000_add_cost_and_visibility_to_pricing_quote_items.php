<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_quote_items', function (Blueprint $table) {
            $table->decimal('cost_amount', 14, 2)->nullable()->after('description');
            $table->boolean('visible_to_client')->default(true)->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('pricing_quote_items', function (Blueprint $table) {
            $table->dropColumn(['cost_amount', 'visible_to_client']);
        });
    }
};
