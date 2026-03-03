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
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('bl_number')->unique()->nullable();
            $table->string('booking_number')->nullable();
            $table->foreignId('sd_form_id')->nullable()->constrained('sd_forms')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sales_rep_id')->nullable()->constrained('users')->nullOnDelete();

            $table->foreignId('line_vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('origin_port_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->foreignId('destination_port_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->string('route_text')->nullable();

            $table->string('shipment_direction', 10)->nullable(); // Export / Import
            $table->string('mode', 10)->default('Sea'); // Sea/Air/Land
            $table->string('shipment_type', 10)->default('FCL');

            $table->string('status', 40)->default('booked'); // commercial status
            $table->unsignedTinyInteger('operations_status')->nullable(); // 1..8 from PDF

            $table->unsignedInteger('container_count')->nullable();
            $table->string('container_size', 10)->nullable();
            $table->string('container_type', 40)->nullable();

            $table->string('loading_place')->nullable();
            $table->date('loading_date')->nullable();

            $table->text('cargo_description')->nullable();

            $table->boolean('is_reefer')->default(false);
            $table->string('reefer_temp')->nullable();
            $table->string('reefer_vent')->nullable();
            $table->string('reefer_hum')->nullable();

            $table->decimal('cost_total', 14, 2)->nullable();
            $table->decimal('selling_price_total', 14, 2)->nullable();
            $table->decimal('profit_total', 14, 2)->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
