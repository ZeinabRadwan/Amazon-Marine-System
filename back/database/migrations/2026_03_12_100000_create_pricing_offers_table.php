<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_offers', function (Blueprint $table) {
            $table->id();
            $table->string('pricing_type', 20); // sea or inland
            $table->string('region')->nullable();
            $table->string('pod')->nullable();
            $table->string('shipping_line')->nullable();
            $table->string('pol')->nullable();
            $table->string('dnd')->nullable();
            $table->string('transit_time')->nullable();
            $table->string('inland_port')->nullable();
            $table->string('destination')->nullable();
            $table->string('inland_gov')->nullable();
            $table->string('inland_city')->nullable();
            $table->date('valid_to')->nullable();
            $table->string('status', 40)->default('draft');
            $table->string('other_charges')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['pricing_type', 'region', 'pod']);
            $table->index(['pricing_type', 'inland_port']);
            $table->index(['pricing_type', 'shipping_line']);
            $table->index(['status']);
        });

        Schema::create('pricing_offer_sailing_dates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pricing_offer_id')->constrained('pricing_offers')->cascadeOnDelete();
            $table->date('sailing_date');
            $table->timestamps();
        });

        Schema::create('pricing_offer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pricing_offer_id')->constrained('pricing_offers')->cascadeOnDelete();
            $table->string('code', 50);
            $table->decimal('price', 14, 2)->nullable();
            $table->string('currency_code', 10)->default('USD');
            $table->timestamps();

            $table->index(['pricing_offer_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_offer_items');
        Schema::dropIfExists('pricing_offer_sailing_dates');
        Schema::dropIfExists('pricing_offers');
    }
};

