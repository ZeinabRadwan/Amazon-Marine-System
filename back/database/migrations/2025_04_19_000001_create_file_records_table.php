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
            // Any model can own files: users, products, invoices, etc.
            $table->nullableMorphs('fileable'); // adds fileable_type + fileable_id (nullable for standalone uploads)

            // === STORAGE LOCATION ===
            $table->string('disk', 50);           // 'local' | 'google_drive' | 's3' | 'dropbox'
            $table->string('path');               // Full path on the disk: 'uploads/2025/01/filename.pdf'
            $table->string('visibility', 20)->default('private'); // 'public' | 'private'
            $table->string('bucket')->nullable(); // S3 bucket name, Google Drive folder ID, etc.

            // === FILE METADATA ===
            $table->string('original_name');      // Original filename from user's computer
            $table->string('stored_name');        // UUID-based stored filename
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');   // Bytes
            $table->string('extension', 20)->nullable();
            $table->string('category', 50)->nullable(); // 'image' | 'document' | 'video' | 'other'
            $table->string('collection', 100)->nullable(); // logical grouping: 'avatars', 'invoices', 'products'

            // === URL CACHE ===
            // For Google Drive/S3 signed URLs that expire, cache them here
            $table->text('cached_url')->nullable();
            $table->timestamp('url_expires_at')->nullable();

            // === DRIVER-SPECIFIC METADATA ===
            // Flexible JSON for any extra info the driver needs
            // Google Drive: { "file_id": "1BxiMV...", "web_view_link": "..." }
            // S3: { "etag": "...", "version_id": "..." }
            // Local: {}
            $table->json('driver_metadata')->nullable();

            // === STATUS ===
            $table->string('status', 30)->default('active'); // 'active' | 'deleted' | 'migrating'
            $table->unsignedBigInteger('uploaded_by')->nullable(); // FK to users.id
            // $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();

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
