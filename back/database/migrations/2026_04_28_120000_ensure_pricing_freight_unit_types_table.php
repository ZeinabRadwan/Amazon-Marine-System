<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Some environments missed the original migration; create the table only if absent.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pricing_freight_unit_types')) {
            return;
        }

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
        // Do not drop: table may have pre-existed before this migration.
    }
};
