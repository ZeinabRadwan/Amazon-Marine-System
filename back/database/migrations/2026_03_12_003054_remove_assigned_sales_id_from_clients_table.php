<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('clients', 'assigned_sales_id')) {
            return;
        }

        $foreignKey = DB::selectOne(
            'SELECT CONSTRAINT_NAME as constraint_name
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
              AND REFERENCED_TABLE_NAME IS NOT NULL',
            [
                DB::connection()->getDatabaseName(),
                'clients',
                'assigned_sales_id',
            ],
        );

        Schema::table('clients', function (Blueprint $table) use ($foreignKey) {
            if ($foreignKey !== null) {
                $table->dropForeign($foreignKey->constraint_name);
            }

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
