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
        Schema::table('treasury_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('treasury_entries', 'exchange_rate_source')) {
                $table->string('exchange_rate_source', 16)->nullable()->after('exchange_rate');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('treasury_entries', function (Blueprint $table) {
            if (Schema::hasColumn('treasury_entries', 'exchange_rate_source')) {
                $table->dropColumn('exchange_rate_source');
            }
        });
    }
};
