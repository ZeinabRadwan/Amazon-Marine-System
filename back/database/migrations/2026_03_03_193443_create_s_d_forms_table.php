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
        Schema::create('sd_forms', function (Blueprint $table) {
            $table->id();
            $table->string('sd_number')->unique();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sales_rep_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('draft');

            $table->foreignId('pol_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->foreignId('pod_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->string('pol_text')->nullable();
            $table->string('pod_text')->nullable();
            $table->string('final_destination')->nullable();

            $table->string('shipment_direction', 10); // Export / Import

            $table->text('shipper_info')->nullable();
            $table->text('consignee_info')->nullable();
            $table->string('notify_party_mode', 20)->default('same'); // same / different
            $table->text('notify_party_details')->nullable();

            $table->string('freight_term', 20)->nullable(); // Prepaid / Collect

            $table->string('container_type', 40)->nullable();
            $table->string('container_size', 10)->nullable();
            $table->unsignedInteger('num_containers')->default(1);

            $table->date('requested_vessel_date')->nullable();
            $table->string('acid_number')->nullable();

            $table->text('cargo_description')->nullable();
            $table->string('hs_code', 32)->nullable();

            $table->string('reefer_temp')->nullable();
            $table->string('reefer_vent')->nullable();
            $table->string('reefer_hum')->nullable();

            $table->decimal('total_gross_weight', 12, 2)->nullable();
            $table->decimal('total_net_weight', 12, 2)->nullable();

            $table->foreignId('linked_shipment_id')->nullable()->constrained('shipments')->nullOnDelete();

            $table->timestamps();

            $table->index('status');
            $table->index('shipment_direction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sd_forms');
    }
};
