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
        Schema::create('customer_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id'); // maps to clients table
            $table->unsignedBigInteger('invoice_id')->nullable();
            $table->string('type', 20); // debit / credit
            $table->decimal('amount', 15, 2);
            $table->unsignedBigInteger('currency_id');
            $table->string('description')->nullable();
            $table->timestamps();
            
            $table->foreign('customer_id')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_transactions');
    }
};
