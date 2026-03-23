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
        Schema::table('visits', function (Blueprint $table) {
            if (! Schema::hasColumn('visits', 'visitable_type')) {
                $table->string('visitable_type')->nullable()->after('id');
            }

            if (! Schema::hasColumn('visits', 'visitable_id')) {
                $table->unsignedBigInteger('visitable_id')->nullable()->after('visitable_type');
            }
        });

        if (Schema::hasColumn('visits', 'client_id')) {
            DB::table('visits')->update([
                'visitable_type' => 'App\Models\Client',
                'visitable_id' => DB::raw('client_id'),
            ]);

            $foreignKey = DB::selectOne(
                'SELECT CONSTRAINT_NAME as constraint_name
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                LIMIT 1',
                [
                    DB::connection()->getDatabaseName(),
                    'visits',
                    'client_id',
                ],
            );

            Schema::table('visits', function (Blueprint $table) use ($foreignKey) {
                if ($foreignKey !== null) {
                    $table->dropForeign($foreignKey->constraint_name);
                }

                $table->dropColumn('client_id');
                $table->index(['visitable_type', 'visitable_id']);
            });
        } else {
            // If `client_id` is already removed, ensure the new index exists.
            Schema::table('visits', function (Blueprint $table) {
                $table->index(['visitable_type', 'visitable_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropIndex(['visitable_type', 'visitable_id']);
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('id')->constrained('clients')->cascadeOnDelete();
        });

        DB::table('visits')
            ->where('visitable_type', 'App\Models\Client')
            ->update(['client_id' => DB::raw('visitable_id')]);

        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn(['visitable_type', 'visitable_id']);
        });
    }
};
