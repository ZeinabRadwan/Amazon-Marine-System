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
            $this->dropForeignKeyOnColumn('treasury_entries', 'expense_id');

            if (! $this->treasuryEntriesExpenseIdForeignExists()) {
                Schema::table('treasury_entries', function (Blueprint $table) {
                    $table->foreign('expense_id')
                        ->references('id')
                        ->on('expenses')
                        ->nullOnDelete();
                });
            }
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

    /**
     * MySQL stores FK names that may differ from Laravel’s default ({table}_{column}_foreign).
     */
    private function mysqlForeignKeyExists(string $table, string $column, string $referencedTable): bool
    {
        $connection = Schema::getConnection();
        if ($connection->getDriverName() !== 'mysql') {
            return false;
        }

        $database = $connection->getDatabaseName();
        $rows = $connection->select(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME = ? AND REFERENCED_COLUMN_NAME IS NOT NULL',
            [$database, $table, $column, $referencedTable]
        );

        return count($rows) > 0;
    }

    private function treasuryEntriesExpenseIdForeignExists(): bool
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'mysql') {
            return $this->mysqlForeignKeyExists('treasury_entries', 'expense_id', 'expenses');
        }

        if ($driver === 'sqlite') {
            $rows = $connection->select("PRAGMA foreign_key_list('treasury_entries')");
            foreach ($rows as $row) {
                if (($row->from ?? '') === 'expense_id' && ($row->table ?? '') === 'expenses') {
                    return true;
                }
            }

            return false;
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private function mysqlForeignKeyNamesOnColumn(string $table, string $column): array
    {
        $connection = Schema::getConnection();
        if ($connection->getDriverName() !== 'mysql') {
            return [];
        }

        $database = $connection->getDatabaseName();
        $rows = $connection->select(
            'SELECT DISTINCT CONSTRAINT_NAME AS c FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$database, $table, $column]
        );

        $names = [];
        foreach ($rows as $row) {
            $n = $row->c ?? null;
            if (is_string($n) && $n !== '') {
                $names[] = $n;
            }
        }

        return $names;
    }

    private function dropForeignKeyOnColumn(string $table, string $column): void
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'mysql') {
            $safeTable = str_replace('`', '``', $table);
            foreach ($this->mysqlForeignKeyNamesOnColumn($table, $column) as $name) {
                $safeName = str_replace('`', '``', $name);
                $connection->statement("ALTER TABLE `{$safeTable}` DROP FOREIGN KEY `{$safeName}`");
            }

            return;
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($column): void {
                $blueprint->dropForeign([$column]);
            });
        } catch (Throwable) {
            // No FK or non-default name on this driver — ignore.
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('treasury_entries') && Schema::hasColumn('treasury_entries', 'expense_id')) {
            $this->dropForeignKeyOnColumn('treasury_entries', 'expense_id');

            if (! $this->treasuryEntriesExpenseIdForeignExists()) {
                Schema::table('treasury_entries', function (Blueprint $table) {
                    $table->foreign('expense_id')
                        ->references('id')
                        ->on('expenses')
                        ->cascadeOnDelete();
                });
            }
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
