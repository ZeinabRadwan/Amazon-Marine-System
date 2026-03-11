<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table): void {
            $table->string('invoice_type', 20)->default('client')->after('id');
            $table->unsignedBigInteger('currency_id')->nullable()->after('status');
            $table->boolean('is_vat_invoice')->default(false)->after('tax_amount');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropColumn(['invoice_type', 'currency_id', 'is_vat_invoice']);
        });
    }
};

