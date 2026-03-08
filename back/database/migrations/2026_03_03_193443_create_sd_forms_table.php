<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('s_d_forms', function (Blueprint $table) {
            $table->id();
            $table->string('sd_number')->nullable();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('sales_rep_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 40)->default('draft');
            $table->foreignId('pol_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->foreignId('pod_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->string('pol_text', 255)->nullable();
            $table->string('pod_text', 255)->nullable();
            $table->string('final_destination', 255)->nullable();
            $table->string('shipment_direction', 50)->nullable();
            $table->text('shipper_info')->nullable();
            $table->text('consignee_info')->nullable();
            $table->string('notify_party_mode', 50)->nullable();
            $table->text('notify_party_details')->nullable();
            $table->string('freight_term', 50)->nullable();
            $table->string('container_type', 50)->nullable();
            $table->string('container_size', 20)->nullable();
            $table->unsignedSmallInteger('num_containers')->nullable();
            $table->date('requested_vessel_date')->nullable();
            $table->string('acid_number', 100)->nullable();
            $table->text('cargo_description')->nullable();
            $table->string('hs_code', 50)->nullable();
            $table->decimal('reefer_temp', 6, 2)->nullable();
            $table->string('reefer_vent', 50)->nullable();
            $table->decimal('reefer_hum', 5, 2)->nullable();
            $table->decimal('total_gross_weight', 14, 2)->nullable();
            $table->decimal('total_net_weight', 14, 2)->nullable();
            $table->unsignedBigInteger('linked_shipment_id')->nullable();
            $table->timestamps();
        });

        Schema::table('s_d_forms', function (Blueprint $table) {
            $table->foreign('linked_shipment_id')->references('id')->on('shipments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table) {
            $table->dropForeign(['linked_shipment_id']);
        });
        Schema::dropIfExists('s_d_forms');
    }
};
