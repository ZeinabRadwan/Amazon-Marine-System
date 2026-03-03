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
        Schema::create('shipment_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transport_contractor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('customs_broker_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('insurance_company_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('overseas_agent_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->date('cut_off_date')->nullable();
            $table->dateTime('etd')->nullable();
            $table->dateTime('eta')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_operations');
    }
};
