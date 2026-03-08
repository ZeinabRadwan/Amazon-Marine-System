<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_bills', function (Blueprint $table) {
            $table->id();
            $table->string('bill_number');
            $table->foreignId('vendor_id')->constrained('vendors')->cascadeOnDelete();
            $table->foreignId('shipment_id')->nullable()->constrained('shipments')->nullOnDelete();
            $table->date('bill_date')->nullable();
            $table->date('due_date')->nullable();
            $table->string('status', 40)->default('draft');
            $table->string('currency_code', 10)->default('USD');
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->decimal('tax_amount', 14, 2)->default(0);
            $table->decimal('net_amount', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_bills');
    }
};
