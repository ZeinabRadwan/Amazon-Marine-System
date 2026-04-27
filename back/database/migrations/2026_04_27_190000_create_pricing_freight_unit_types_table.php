<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_freight_unit_types', function (Blueprint $table) {
            $table->id();
            $table->string('dataset', 32);
            $table->string('slug', 80);
            $table->string('label', 255);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['dataset', 'slug']);
            $table->index(['dataset', 'active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_freight_unit_types');
    }
};
