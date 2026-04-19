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
        Schema::create('storage_disks', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();       // 'google_drive_project_x', 's3_invoices'
            $table->string('driver', 50);               // 'google_drive' | 's3' | 'local'
            $table->json('config');                     // Encrypted credentials/settings
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->string('label')->nullable();         // Human readable: "Google Drive - Main"
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('storage_disks');
    }
};
