<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_lines', function (Blueprint $table) {
            $table->string('service_scope', 16)->default('both')->after('active');
            $table->index('service_scope');
        });
    }

    public function down(): void
    {
        Schema::table('shipping_lines', function (Blueprint $table) {
            $table->dropIndex(['service_scope']);
            $table->dropColumn('service_scope');
        });
    }
};
