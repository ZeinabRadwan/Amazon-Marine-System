<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('treasury_entries')) {
            Schema::table('treasury_entries', function (Blueprint $table) {
                if (! Schema::hasColumn('treasury_entries', 'is_voided')) {
                    $table->boolean('is_voided')->default(false)->after('expense_id');
                }
                if (! Schema::hasColumn('treasury_entries', 'voided_at')) {
                    $table->timestamp('voided_at')->nullable()->after('is_voided');
                }
            });
        }

        if (Schema::hasTable('expenses')) {
            Schema::table('expenses', function (Blueprint $table) {
                if (! Schema::hasColumn('expenses', 'treasury_transaction_id')) {
                    $table->unsignedBigInteger('treasury_transaction_id')
                        ->nullable()
                        ->after('bank_account_id');
                }
            });
        }

        if (Schema::hasTable('expenses') && Schema::hasTable('treasury_entries')) {
            $links = DB::table('treasury_entries')->whereNotNull('expense_id')->get(['id', 'expense_id']);
            foreach ($links as $row) {
                DB::table('expenses')
                    ->where('id', $row->expense_id)
                    ->whereNull('treasury_transaction_id')
                    ->update(['treasury_transaction_id' => $row->id]);
            }
        }

        $this->ensureExpensesTreasuryTransactionForeign();

        if (Schema::hasTable('treasury_entries') && Schema::hasColumn('treasury_entries', 'expense_id')) {
            Schema::table('treasury_entries', function (Blueprint $table) {
                $table->dropForeign(['expense_id']);
            });

            Schema::table('treasury_entries', function (Blueprint $table) {
                $table->foreign('expense_id')
                    ->references('id')
                    ->on('expenses')
                    ->nullOnDelete();
            });
        }
    }

    /**
     * Link expenses to their treasury row when the column is new (no FK yet).
     */
    private function ensureExpensesTreasuryTransactionForeign(): void
    {
        if (! Schema::hasTable('expenses') || ! Schema::hasColumn('expenses', 'treasury_transaction_id')) {
            return;
        }

        if ($this->expensesTreasuryTransactionForeignExists()) {
            return;
        }

        Schema::table('expenses', function (Blueprint $table) {
            $table->foreign('treasury_transaction_id')
                ->references('id')
                ->on('treasury_entries')
                ->nullOnDelete();
        });
    }

    private function expensesTreasuryTransactionForeignExists(): bool
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'sqlite') {
            $rows = $connection->select("PRAGMA foreign_key_list('expenses')");
            foreach ($rows as $row) {
                $from = $row->from ?? null;
                $toTable = $row->table ?? null;
                if ($from === 'treasury_transaction_id' && $toTable === 'treasury_entries') {
                    return true;
                }
            }

            return false;
        }

        $database = $connection->getDatabaseName();
        $rows = $connection->select(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$database, 'expenses', 'treasury_transaction_id']
        );

        return count($rows) > 0;
    }

    public function down(): void
    {
        if (Schema::hasTable('treasury_entries') && Schema::hasColumn('treasury_entries', 'expense_id')) {
            Schema::table('treasury_entries', function (Blueprint $table) {
                $table->dropForeign(['expense_id']);
            });

            Schema::table('treasury_entries', function (Blueprint $table) {
                $table->foreign('expense_id')
                    ->references('id')
                    ->on('expenses')
                    ->cascadeOnDelete();
            });
        }

        if (Schema::hasTable('expenses') && Schema::hasColumn('expenses', 'treasury_transaction_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                if ($this->expensesTreasuryTransactionForeignExists()) {
                    $table->dropForeign(['treasury_transaction_id']);
                }
                $table->dropColumn('treasury_transaction_id');
            });
        }

        if (Schema::hasTable('treasury_entries')) {
            Schema::table('treasury_entries', function (Blueprint $table) {
                if (Schema::hasColumn('treasury_entries', 'voided_at')) {
                    $table->dropColumn('voided_at');
                }
                if (Schema::hasColumn('treasury_entries', 'is_voided')) {
                    $table->dropColumn('is_voided');
                }
            });
        }
    }
};
