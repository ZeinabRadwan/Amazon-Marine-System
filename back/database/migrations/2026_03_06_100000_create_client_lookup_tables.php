<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('preferred_comm_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('interest_levels', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('decision_maker_titles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('lead_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_sources');
        Schema::dropIfExists('decision_maker_titles');
        Schema::dropIfExists('interest_levels');
        Schema::dropIfExists('preferred_comm_methods');
        Schema::dropIfExists('company_types');
    }
};
