<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('receipt_number', 64)->unique();
            $table->string('receipt_kind', 32)->default('mixed');
            $table->json('totals_by_currency')->nullable();
            $table->string('pdf_path')->nullable();
            $table->string('locale', 8)->default('en');
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('cash_receipt_payment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_receipt_id')->constrained('cash_receipts')->cascadeOnDelete();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
            $table->unique('payment_id');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_receipt_payment');
        Schema::dropIfExists('cash_receipts');
    }
};
