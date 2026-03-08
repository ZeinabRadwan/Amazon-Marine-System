<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_entries', function (Blueprint $table) {
            $table->id();
            $table->string('entry_type', 40)->nullable();
            $table->string('source', 80)->nullable();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('currency_code', 10)->default('USD');
            $table->string('method', 80)->nullable();
            $table->string('reference', 255)->nullable();
            $table->text('notes')->nullable();
            $table->date('entry_date')->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_entries');
    }
};
