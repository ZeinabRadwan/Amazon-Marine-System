<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('bank_accounts', 'name_ar')) {
                $table->string('name_ar', 255)->nullable()->after('account_name');
            }
            if (! Schema::hasColumn('bank_accounts', 'name_en')) {
                $table->string('name_en', 255)->nullable()->after('name_ar');
            }
            if (! Schema::hasColumn('bank_accounts', 'notes')) {
                $table->text('notes')->nullable()->after('supported_currencies');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('bank_accounts', 'notes')) {
                $table->dropColumn('notes');
            }
            if (Schema::hasColumn('bank_accounts', 'name_en')) {
                $table->dropColumn('name_en');
            }
            if (Schema::hasColumn('bank_accounts', 'name_ar')) {
                $table->dropColumn('name_ar');
            }
        });
    }
};
