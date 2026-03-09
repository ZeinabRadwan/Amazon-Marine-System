<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pdf_layouts', function (Blueprint $table) {
            $table->id();
            $table->string('document_type')->unique();
            $table->text('header_html')->nullable();
            $table->text('footer_html')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdf_layouts');
    }
};

