<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('bl_number')->nullable();
            $table->string('booking_number')->nullable();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('sales_rep_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('line_vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('origin_port_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->foreignId('destination_port_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->string('route_text', 255)->nullable();
            $table->string('shipment_direction', 50)->nullable();
            $table->string('mode', 50)->nullable();
            $table->string('shipment_type', 50)->nullable();
            $table->string('status', 40)->nullable();
            $table->unsignedTinyInteger('operations_status')->nullable();
            $table->unsignedSmallInteger('container_count')->nullable();
            $table->string('container_size', 20)->nullable();
            $table->string('container_type', 50)->nullable();
            $table->string('loading_place', 255)->nullable();
            $table->date('loading_date')->nullable();
            $table->text('cargo_description')->nullable();
            $table->boolean('is_reefer')->default(false);
            $table->decimal('reefer_temp', 6, 2)->nullable();
            $table->string('reefer_vent', 50)->nullable();
            $table->decimal('reefer_hum', 5, 2)->nullable();
            $table->decimal('cost_total', 14, 2)->nullable();
            $table->decimal('selling_price_total', 14, 2)->nullable();
            $table->decimal('profit_total', 14, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
