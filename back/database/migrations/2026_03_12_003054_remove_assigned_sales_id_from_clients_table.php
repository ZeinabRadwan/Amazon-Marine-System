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
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['assigned_sales_id']);
            $table->dropColumn('assigned_sales_id');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->unsignedBigInteger('assigned_sales_id')->nullable()->after('decision_maker_title_other');
            $table->foreign('assigned_sales_id')->references('id')->on('users')->nullOnDelete();
        });
    }
};
