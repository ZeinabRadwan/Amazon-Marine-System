<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_category_id')->nullable()->constrained('expense_categories')->nullOnDelete();
            $table->string('description')->nullable();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('currency_code', 10)->default('USD');
            $table->date('expense_date')->nullable();
            $table->foreignId('paid_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('shipment_id')->nullable()->constrained('shipments')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
