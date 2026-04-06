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
        Schema::table('s_d_forms', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('hs_code');
        });
    }

    public function down(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};
