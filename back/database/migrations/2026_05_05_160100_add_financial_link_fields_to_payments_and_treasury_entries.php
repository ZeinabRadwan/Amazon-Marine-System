<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                if (! Schema::hasColumn('payments', 'shipment_id')) {
                    $table->foreignId('shipment_id')->nullable()->after('vendor_id')->constrained('shipments')->nullOnDelete();
                }
                if (! Schema::hasColumn('payments', 'source_account_id')) {
                    $table->foreignId('source_account_id')->nullable()->after('currency_code')->constrained('bank_accounts')->nullOnDelete();
                }
                if (! Schema::hasColumn('payments', 'target_account_id')) {
                    $table->foreignId('target_account_id')->nullable()->after('source_account_id')->constrained('bank_accounts')->nullOnDelete();
                }
                if (! Schema::hasColumn('payments', 'target_currency_code')) {
                    $table->string('target_currency_code', 10)->nullable()->after('target_account_id');
                }
                if (! Schema::hasColumn('payments', 'exchange_rate')) {
                    $table->decimal('exchange_rate', 18, 8)->nullable()->after('target_currency_code');
                }
                if (! Schema::hasColumn('payments', 'converted_amount')) {
                    $table->decimal('converted_amount', 14, 2)->nullable()->after('exchange_rate');
                }
                if (! Schema::hasColumn('payments', 'notes')) {
                    $table->text('notes')->nullable()->after('reference');
                }
            });
        }

        if (Schema::hasTable('treasury_entries')) {
            Schema::table('treasury_entries', function (Blueprint $table) {
                if (! Schema::hasColumn('treasury_entries', 'account_id')) {
                    $table->foreignId('account_id')->nullable()->after('source')->constrained('bank_accounts')->nullOnDelete();
                }
                if (! Schema::hasColumn('treasury_entries', 'counter_account_id')) {
                    $table->foreignId('counter_account_id')->nullable()->after('account_id')->constrained('bank_accounts')->nullOnDelete();
                }
                if (! Schema::hasColumn('treasury_entries', 'exchange_rate')) {
                    $table->decimal('exchange_rate', 18, 8)->nullable()->after('currency_code');
                }
                if (! Schema::hasColumn('treasury_entries', 'target_currency_code')) {
                    $table->string('target_currency_code', 10)->nullable()->after('exchange_rate');
                }
                if (! Schema::hasColumn('treasury_entries', 'converted_amount')) {
                    $table->decimal('converted_amount', 14, 2)->nullable()->after('target_currency_code');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('treasury_entries')) {
            Schema::table('treasury_entries', function (Blueprint $table) {
                foreach (['converted_amount', 'target_currency_code', 'exchange_rate', 'counter_account_id', 'account_id'] as $col) {
                    if (Schema::hasColumn('treasury_entries', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                foreach (['notes', 'converted_amount', 'exchange_rate', 'target_currency_code', 'target_account_id', 'source_account_id', 'shipment_id'] as $col) {
                    if (Schema::hasColumn('payments', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
