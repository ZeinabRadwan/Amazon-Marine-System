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
        Schema::create('file_records', function (Blueprint $table) {
            $table->id();

            // === POLYMORPHIC OWNERSHIP ===
            $table->nullableMorphs('fileable');

            // === STORAGE LOCATION ===
            $table->string('disk', 50);
            $table->string('path');
            $table->string('visibility', 20)->default('private');
            $table->string('bucket')->nullable();

            // === FILE METADATA ===
            $table->string('original_name');
            $table->string('stored_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->string('extension', 20)->nullable();
            $table->string('category', 50)->nullable();
            $table->string('collection', 100)->nullable();

            // === URL CACHE ===
            $table->text('cached_url')->nullable();
            $table->timestamp('url_expires_at')->nullable();

            // === DRIVER-SPECIFIC METADATA ===
            $table->json('driver_metadata')->nullable();

            // === STATUS ===
            $table->string('status', 30)->default('active');
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // === INDEXES ===
            $table->index(['fileable_type', 'fileable_id']);
            $table->index('disk');
            $table->index('collection');
            $table->index('uploaded_by');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('file_records');
    }
};
