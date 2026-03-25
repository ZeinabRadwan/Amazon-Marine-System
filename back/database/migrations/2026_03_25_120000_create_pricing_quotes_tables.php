<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_quotes', function (Blueprint $table) {
            $table->id();
            $table->string('quote_no', 40)->unique();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('sales_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('pricing_offer_id')->nullable()->constrained('pricing_offers')->nullOnDelete();

            $table->string('pol')->nullable();
            $table->string('pod')->nullable();
            $table->string('shipping_line')->nullable();
            $table->string('container_type', 50)->nullable();
            $table->unsignedInteger('qty')->nullable();
            $table->string('transit_time')->nullable();
            $table->string('free_time')->nullable();
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 40)->default('pending'); // pending | accepted | rejected
            $table->timestamps();

            $table->index(['status']);
            $table->index(['client_id']);
            $table->index(['sales_user_id']);
            $table->index(['pricing_offer_id']);
            $table->index(['valid_to']);
        });

        Schema::create('pricing_quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pricing_quote_id')->constrained('pricing_quotes')->cascadeOnDelete();
            $table->string('code', 50)->nullable();
            $table->string('name', 120);
            $table->string('description')->nullable();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('currency_code', 10)->default('USD');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['pricing_quote_id', 'sort_order']);
        });

        Schema::create('pricing_quote_sailing_dates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pricing_quote_id')->constrained('pricing_quotes')->cascadeOnDelete();
            $table->date('sailing_date');
            $table->timestamps();

            $table->index(['pricing_quote_id', 'sailing_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_quote_sailing_dates');
        Schema::dropIfExists('pricing_quote_items');
        Schema::dropIfExists('pricing_quotes');
    }
};

