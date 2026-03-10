<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->foreignId('vendor_id')->nullable()->after('shipment_id')->constrained('vendors')->nullOnDelete();
            $table->string('payment_method')->nullable()->after('vendor_id');
            $table->string('invoice_number')->nullable()->after('payment_method');
            $table->boolean('has_receipt')->default(false)->after('invoice_number');
            $table->string('receipt_path')->nullable()->after('has_receipt');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
            $table->dropColumn(['payment_method', 'invoice_number', 'has_receipt', 'receipt_path']);
        });
    }
};
