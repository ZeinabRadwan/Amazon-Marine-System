<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('pricing_tier')->nullable()->after('last_contact_at');
            $table->decimal('pricing_discount_pct', 5, 2)->nullable()->after('pricing_tier');
            $table->timestamp('pricing_updated_at')->nullable()->after('pricing_discount_pct');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['pricing_tier', 'pricing_discount_pct', 'pricing_updated_at']);
        });
    }
};
