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
        Schema::create('treasury_entries', function (Blueprint $table) {
            $table->id();
            $table->string('entry_type', 10); // in, out
            $table->string('source', 40)->nullable(); // payment, manual_adjustment, expense
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('currency_code', 3)->default('USD');
            $table->string('method', 20)->nullable();
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->date('entry_date');
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('treasury_entries');
    }
};
