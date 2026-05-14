<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->boolean('pricing_team_confirmed')->default(false)->after('official_receipts_note');
        });
    }

    public function down(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->dropColumn('pricing_team_confirmed');
        });
    }
};
