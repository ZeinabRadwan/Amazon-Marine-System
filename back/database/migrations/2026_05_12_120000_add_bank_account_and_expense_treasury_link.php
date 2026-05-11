<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('expenses')) {
            Schema::table('expenses', function (Blueprint $table) {
                if (! Schema::hasColumn('expenses', 'bank_account_id')) {
                    $table->foreignId('bank_account_id')
                        ->nullable()
                        ->after('paid_by_id')
                        ->constrained('bank_accounts')
                        ->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('treasury_entries')) {
            Schema::table('treasury_entries', function (Blueprint $table) {
                if (! Schema::hasColumn('treasury_entries', 'expense_id')) {
                    $table->foreignId('expense_id')
                        ->nullable()
                        ->after('payment_id')
                        ->constrained('expenses')
                        ->cascadeOnDelete();
                    $table->unique('expense_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('treasury_entries')) {
            Schema::table('treasury_entries', function (Blueprint $table) {
                if (Schema::hasColumn('treasury_entries', 'expense_id')) {
                    $table->dropForeign(['expense_id']);
                    $table->dropColumn('expense_id');
                }
            });
        }

        if (Schema::hasTable('expenses')) {
            Schema::table('expenses', function (Blueprint $table) {
                if (Schema::hasColumn('expenses', 'bank_account_id')) {
                    $table->dropForeign(['bank_account_id']);
                    $table->dropColumn('bank_account_id');
                }
            });
        }
    }
};
