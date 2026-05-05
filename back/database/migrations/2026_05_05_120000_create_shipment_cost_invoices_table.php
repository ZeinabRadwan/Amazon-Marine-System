<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipment_cost_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->unique()->constrained('shipments')->cascadeOnDelete();
            $table->string('invoice_number')->nullable();
            $table->date('invoice_date')->nullable();
            $table->string('status', 40)->default('draft');
            $table->json('items')->nullable();
            $table->json('attachment_refs')->nullable();
            $table->json('currency_totals')->nullable();
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_cost_invoices');
    }
};
