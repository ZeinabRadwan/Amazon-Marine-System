<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('clients', 'assigned_sales_id')) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) {
            $table->foreignId('assigned_sales_id')->nullable()->after('pricing_updated_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('clients', 'assigned_sales_id')) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['assigned_sales_id']);
            $table->dropColumn('assigned_sales_id');
        });
    }
};
