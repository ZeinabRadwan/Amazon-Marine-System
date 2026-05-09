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
        Schema::table('treasury_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('treasury_entries', 'journal_transaction_id')) {
                $table->char('journal_transaction_id', 36)->nullable();
                $table->index('journal_transaction_id');
            }
            if (! Schema::hasColumn('treasury_entries', 'journal_kind')) {
                $table->string('journal_kind', 40)->nullable();
            }
            if (! Schema::hasColumn('treasury_entries', 'ledger_side')) {
                $table->string('ledger_side', 16)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('treasury_entries', function (Blueprint $table) {
            if (Schema::hasColumn('treasury_entries', 'ledger_side')) {
                $table->dropColumn('ledger_side');
            }
            if (Schema::hasColumn('treasury_entries', 'journal_kind')) {
                $table->dropColumn('journal_kind');
            }
            if (Schema::hasColumn('treasury_entries', 'journal_transaction_id')) {
                $table->dropIndex(['journal_transaction_id']);
                $table->dropColumn('journal_transaction_id');
            }
        });
    }
};
