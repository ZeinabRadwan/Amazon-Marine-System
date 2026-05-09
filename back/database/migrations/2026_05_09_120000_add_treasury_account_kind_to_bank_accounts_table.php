<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('bank_accounts')) {
            return;
        }

        Schema::table('bank_accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('bank_accounts', 'treasury_account_kind')) {
                $table->string('treasury_account_kind', 32)->default('bank')->after('is_active');
            }
            if (! Schema::hasColumn('bank_accounts', 'cash_wallet_kind')) {
                $table->string('cash_wallet_kind', 32)->nullable()->after('treasury_account_kind');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('bank_accounts')) {
            return;
        }

        Schema::table('bank_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('bank_accounts', 'cash_wallet_kind')) {
                $table->dropColumn('cash_wallet_kind');
            }
            if (Schema::hasColumn('bank_accounts', 'treasury_account_kind')) {
                $table->dropColumn('treasury_account_kind');
            }
        });
    }
};
