# Flexible Multi-Storage Implementation Plan
## Laravel (back/) + React (front/) Application

> **Purpose of this document:** A step-by-step implementation guide for adding flexible file storage support (Google Drive as the first cloud provider), with an extensible architecture that supports adding more providers (S3, Dropbox, etc.) in the future.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Database Design](#2-database-design)
3. [Laravel Backend Implementation](#3-laravel-backend-implementation)
   - 3.1 Packages & Config
   - 3.2 Storage Drivers Setup
   - 3.3 Eloquent Models
   - 3.4 StorageManager Service
   - 3.5 FileService
   - 3.6 API Controllers & Routes
4. [React Frontend Implementation](#4-react-frontend-implementation)
   - 4.1 Upload Hook
   - 4.2 File Display Component
   - 4.3 Storage Selector (Admin)
5. [Testing Scenarios Checklist](#5-testing-scenarios-checklist)
6. [Migration Path / Future Providers](#6-migration-path--future-providers)
7. [Environment Variables Reference](#7-environment-variables-reference)

---

## 1. Architecture Overview

### Design Principles
- **Single Responsibility:** Each storage driver is isolated. Laravel's Filesystem contracts are the interface.
- **Polymorphic Files:** Any model (User, Product, Invoice, etc.) can own files via a polymorphic `files` table.
- **Per-File Storage Metadata:** Every uploaded file row knows exactly where it lives (driver, path, bucket/folder, visibility).
- **Transparent URL Generation:** The app always generates a URL/signed URL regardless of which driver holds the file.
- **No Hard-Coded Disk References:** All disk names are read from the database row or a config, never hard-coded in business logic.

### Flow Diagram

```
React Upload Component
        │
        ▼
POST /api/files/upload  ←── FormData (file + disk_preference?)
        │
        ▼
FileController
        │
        ├── resolves which disk to use (default config or user choice)
        │
        ▼
FileService
        │
        ├── StorageManager::disk('google_drive')->put(...)
        │             OR
        ├── StorageManager::disk('local')->put(...)
        │
        ▼
file_records table  ←── stores: disk, path, original_name, mime, size, metadata JSON
        │
        ▼
Returns: { id, url, name, size, disk }
```

---

## 2. Database Design

### 2.1 Migration: `create_file_records_table`

```php
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
```

### 2.2 Migration: `create_storage_disks_table` (optional — for runtime disk management)

```php
// This table allows admins to add/disable disks from the dashboard
// without touching .env or config files.
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
```

### 2.3 Example `file_records` Rows

| id | disk | path | original_name | mime_type | collection | driver_metadata |
|----|------|------|---------------|-----------|------------|-----------------|
| 1 | local | uploads/avatars/uuid.jpg | photo.jpg | image/jpeg | avatars | `{}` |
| 2 | google_drive | invoices/2025/inv-001.pdf | Invoice.pdf | application/pdf | invoices | `{"file_id":"1BxiM..."}` |
| 3 | s3 | products/img-uuid.png | product.png | image/png | products | `{"etag":"abc123"}` |

---

## 3. Laravel Backend Implementation

### 3.1 Packages & Config

**Install packages:**

```bash
composer require masbug/flysystem-google-drive-ext
# For future S3 support (already built into Laravel):
# composer require league/flysystem-aws-s3-v3
```

**`config/filesystems.php` — Add Google Drive disk:**

```php
'disks' => [

    'local' => [
        'driver' => 'local',
        'root'   => storage_path('app'),
    ],

    'public' => [
        'driver'     => 'local',
        'root'       => storage_path('app/public'),
        'url'        => env('APP_URL') . '/storage',
        'visibility' => 'public',
    ],

    'google_drive' => [
        'driver'          => 'google',
        'clientId'        => env('GOOGLE_DRIVE_CLIENT_ID'),
        'clientSecret'    => env('GOOGLE_DRIVE_CLIENT_SECRET'),
        'refreshToken'    => env('GOOGLE_DRIVE_REFRESH_TOKEN'),
        'folder'          => env('GOOGLE_DRIVE_FOLDER', null), // root folder ID or null
    ],

    // Future: S3
    's3' => [
        'driver' => 's3',
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION'),
        'bucket' => env('AWS_BUCKET'),
        'url'    => env('AWS_URL'),
    ],
],

// Default disk for new uploads — can be overridden per request
'default_upload_disk' => env('DEFAULT_UPLOAD_DISK', 'local'),
```

**Register the Google Drive service provider in `AppServiceProvider::boot()`:**

```php
use Illuminate\Support\Facades\Storage;
use Masbug\Flysystem\GoogleDriveAdapter;
use League\Flysystem\Filesystem;
use Google\Client;
use Google\Service\Drive;

Storage::extend('google', function ($app, $config) {
    $client = new Client();
    $client->setClientId($config['clientId']);
    $client->setClientSecret($config['clientSecret']);
    $client->refreshToken($config['refreshToken']);

    $service = new Drive($client);
    $adapter = new GoogleDriveAdapter($service, $config['folder'] ?? '/');

    return new Filesystem($adapter);
});
```

---

### 3.2 Storage Drivers Setup

**`app/Storage/Contracts/StorageDriverInterface.php`**

```php
<?php

namespace App\Storage\Contracts;

use Illuminate\Http\UploadedFile;

interface StorageDriverInterface
{
    // Store a file and return path on the disk
    public function store(UploadedFile $file, string $directory): string;

    // Get a URL (public or signed) for a path
    public function url(string $path, ?int $expiresInMinutes = null): string;

    // Delete a file by path
    public function delete(string $path): bool;

    // Check if file exists
    public function exists(string $path): bool;

    // Return the disk name (matches filesystems.php key)
    public function getDiskName(): string;

    // Return any extra driver-specific metadata after storing
    public function getDriverMetadata(string $path): array;
}
```

**`app/Storage/Drivers/LocalDriver.php`**

```php
<?php

namespace App\Storage\Drivers;

use App\Storage\Contracts\StorageDriverInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class LocalDriver implements StorageDriverInterface
{
    public function store(UploadedFile $file, string $directory): string
    {
        return $file->store($directory, 'local');
    }

    public function url(string $path, ?int $expiresInMinutes = null): string
    {
        // Local public files
        return Storage::disk('local')->url($path);
    }

    public function delete(string $path): bool
    {
        return Storage::disk('local')->delete($path);
    }

    public function exists(string $path): bool
    {
        return Storage::disk('local')->exists($path);
    }

    public function getDiskName(): string
    {
        return 'local';
    }

    public function getDriverMetadata(string $path): array
    {
        return []; // No extra metadata for local
    }
}
```

**`app/Storage/Drivers/GoogleDriveDriver.php`**

```php
<?php

namespace App\Storage\Drivers;

use App\Storage\Contracts\StorageDriverInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class GoogleDriveDriver implements StorageDriverInterface
{
    public function store(UploadedFile $file, string $directory): string
    {
        $path = $directory . '/' . $file->getClientOriginalName();
        Storage::disk('google_drive')->put($path, file_get_contents($file));
        return $path;
    }

    public function url(string $path, ?int $expiresInMinutes = null): string
    {
        // Google Drive direct download link using the file ID stored in metadata
        // The real file_id is stored in driver_metadata — this method receives path
        // In practice, FileService calls getSignedUrl() using driver_metadata['file_id']
        return Storage::disk('google_drive')->url($path);
    }

    public function delete(string $path): bool
    {
        return Storage::disk('google_drive')->delete($path);
    }

    public function exists(string $path): bool
    {
        return Storage::disk('google_drive')->exists($path);
    }

    public function getDiskName(): string
    {
        return 'google_drive';
    }

    public function getDriverMetadata(string $path): array
    {
        // After upload, retrieve Google Drive file ID from the adapter
        try {
            $adapter = Storage::disk('google_drive')->getAdapter();
            $fileId  = $adapter->getFileId($path);
            return [
                'file_id'       => $fileId,
                'web_view_link' => "https://drive.google.com/file/d/{$fileId}/view",
            ];
        } catch (\Throwable $e) {
            return [];
        }
    }
}
```

**`app/Storage/StorageManager.php`** — The central factory

```php
<?php

namespace App\Storage;

use App\Storage\Contracts\StorageDriverInterface;
use App\Storage\Drivers\LocalDriver;
use App\Storage\Drivers\GoogleDriveDriver;
use InvalidArgumentException;

class StorageManager
{
    // Registry: disk_name => driver class
    protected static array $drivers = [
        'local'        => LocalDriver::class,
        'google_drive' => GoogleDriveDriver::class,
        // Future additions:
        // 's3'        => S3Driver::class,
        // 'dropbox'   => DropboxDriver::class,
    ];

    // Resolved instances cache
    protected static array $resolved = [];

    public static function driver(string $diskName): StorageDriverInterface
    {
        if (isset(self::$resolved[$diskName])) {
            return self::$resolved[$diskName];
        }

        if (!isset(self::$drivers[$diskName])) {
            throw new InvalidArgumentException("Storage driver [{$diskName}] is not registered.");
        }

        self::$resolved[$diskName] = app(self::$drivers[$diskName]);
        return self::$resolved[$diskName];
    }

    // Get the default disk from config
    public static function defaultDriver(): StorageDriverInterface
    {
        $disk = config('filesystems.default_upload_disk', 'local');
        return self::driver($disk);
    }

    // Register a new driver at runtime (for plugin-style extensions)
    public static function extend(string $diskName, string $driverClass): void
    {
        self::$drivers[$diskName] = $driverClass;
    }

    // List all registered driver names
    public static function availableDrivers(): array
    {
        return array_keys(self::$drivers);
    }
}
```

---

### 3.3 Eloquent Models

**`app/Models/FileRecord.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Storage\StorageManager;

class FileRecord extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'disk', 'path', 'visibility', 'bucket', 'original_name', 'stored_name',
        'mime_type', 'size', 'extension', 'category', 'collection',
        'cached_url', 'url_expires_at', 'driver_metadata', 'status', 'uploaded_by',
        'fileable_type', 'fileable_id',
    ];

    protected $casts = [
        'driver_metadata' => 'array',
        'url_expires_at'  => 'datetime',
    ];

    // === RELATIONSHIPS ===

    public function fileable()
    {
        return $this->morphTo();
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // === URL GENERATION ===

    /**
     * Get a fresh or cached URL for this file.
     * For Google Drive / S3 signed URLs, caches for 55 minutes.
     */
    public function getUrl(int $expiresInMinutes = 60): string
    {
        // Return cached URL if still valid
        if ($this->cached_url && $this->url_expires_at && $this->url_expires_at->isFuture()) {
            return $this->cached_url;
        }

        $driver = StorageManager::driver($this->disk);
        $url    = $driver->url($this->path, $expiresInMinutes);

        // Cache signed URLs (not public local ones)
        if (!in_array($this->disk, ['local', 'public'])) {
            $this->update([
                'cached_url'    => $url,
                'url_expires_at' => now()->addMinutes($expiresInMinutes - 5),
            ]);
        }

        return $url;
    }

    // === SCOPES ===

    public function scopeOnDisk($query, string $disk)
    {
        return $query->where('disk', $disk);
    }

    public function scopeInCollection($query, string $collection)
    {
        return $query->where('collection', $collection);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
```

**Add `HasFiles` trait for any model:**

**`app/Traits/HasFiles.php`**

```php
<?php

namespace App\Traits;

use App\Models\FileRecord;

trait HasFiles
{
    public function files()
    {
        return $this->morphMany(FileRecord::class, 'fileable');
    }

    public function filesByCollection(string $collection)
    {
        return $this->files()->where('collection', $collection);
    }

    public function singleFile(string $collection)
    {
        return $this->files()->where('collection', $collection)->latest()->first();
    }
}
```

**Usage in any model:**

```php
// app/Models/User.php
use App\Traits\HasFiles;
class User extends Authenticatable {
    use HasFiles;
}

// app/Models/Invoice.php
use App\Traits\HasFiles;
class Invoice extends Model {
    use HasFiles;
}

// Then anywhere:
$user->files()->where('collection', 'avatars')->first()->getUrl();
$invoice->files()->where('collection', 'pdf_exports')->get();
```

---

### 3.4 FileService

**`app/Services/FileService.php`**

```php
<?php

namespace App\Services;

use App\Models\FileRecord;
use App\Storage\StorageManager;
use Illuminate\Http\UploadedFile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FileService
{
    /**
     * Upload a file and persist a FileRecord.
     *
     * @param UploadedFile $file        The uploaded file
     * @param string       $collection  Logical grouping: 'avatars', 'invoices', etc.
     * @param string|null  $diskName    Override disk (null = use default from config)
     * @param Model|null   $owner       The owning model (polymorphic)
     * @param array        $extra       Any extra fields for the record
     */
    public function upload(
        UploadedFile $file,
        string $collection = 'general',
        ?string $diskName = null,
        ?Model $owner = null,
        array $extra = []
    ): FileRecord {
        $diskName  = $diskName ?? config('filesystems.default_upload_disk', 'local');
        $driver    = StorageManager::driver($diskName);
        $directory = $this->resolveDirectory($collection);

        // Generate a safe stored name
        $extension  = $file->getClientOriginalExtension();
        $storedName = Str::uuid() . ($extension ? ".{$extension}" : '');
        $fullPath   = $directory . '/' . $storedName;

        // Store the file on the chosen disk
        $driver->store($file, $directory);

        // Retrieve any driver-specific metadata (e.g., Google Drive file_id)
        $driverMeta = $driver->getDriverMetadata($fullPath);

        // Build the record
        $data = array_merge([
            'disk'          => $diskName,
            'path'          => $fullPath,
            'visibility'    => 'private',
            'original_name' => $file->getClientOriginalName(),
            'stored_name'   => $storedName,
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
            'extension'     => $extension ?: null,
            'category'      => $this->resolveCategory($file->getMimeType()),
            'collection'    => $collection,
            'driver_metadata' => $driverMeta,
            'status'        => 'active',
            'uploaded_by'   => auth()->id(),
        ], $extra);

        if ($owner) {
            $data['fileable_type'] = get_class($owner);
            $data['fileable_id']   = $owner->getKey();
        }

        return FileRecord::create($data);
    }

    /**
     * Delete a file from storage and from the database.
     */
    public function delete(FileRecord $record): bool
    {
        $driver = StorageManager::driver($record->disk);
        $driver->delete($record->path);
        return $record->delete(); // soft delete
    }

    /**
     * Move a file from one disk to another (migration support).
     */
    public function migrate(FileRecord $record, string $targetDisk): FileRecord
    {
        $record->update(['status' => 'migrating']);

        // Download content from source disk
        $sourceStorage  = \Illuminate\Support\Facades\Storage::disk($record->disk);
        $fileContents   = $sourceStorage->get($record->path);

        // Upload to target disk
        $targetStorage  = \Illuminate\Support\Facades\Storage::disk($targetDisk);
        $targetStorage->put($record->path, $fileContents);

        $targetDriver   = StorageManager::driver($targetDisk);
        $driverMeta     = $targetDriver->getDriverMetadata($record->path);

        // Delete from source
        $sourceStorage->delete($record->path);

        // Update record
        $record->update([
            'disk'            => $targetDisk,
            'driver_metadata' => $driverMeta,
            'cached_url'      => null,
            'url_expires_at'  => null,
            'status'          => 'active',
        ]);

        return $record->fresh();
    }

    // === HELPERS ===

    protected function resolveDirectory(string $collection): string
    {
        $date = now()->format('Y/m');
        return "uploads/{$collection}/{$date}";
    }

    protected function resolveCategory(string $mimeType): string
    {
        return match (true) {
            str_starts_with($mimeType, 'image/')       => 'image',
            str_starts_with($mimeType, 'video/')       => 'video',
            str_starts_with($mimeType, 'audio/')       => 'audio',
            in_array($mimeType, [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])                                          => 'document',
            default                                     => 'other',
        };
    }
}
```

---

### 3.5 API Controllers & Routes

**`app/Http/Controllers/Api/FileController.php`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FileRecord;
use App\Services\FileService;
use App\Storage\StorageManager;
use Illuminate\Http\Request;

class FileController extends Controller
{
    public function __construct(protected FileService $fileService) {}

    /**
     * POST /api/files/upload
     * Accepts: file (required), collection, disk, fileable_type, fileable_id
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file'          => 'required|file|max:102400', // 100MB max
            'collection'    => 'nullable|string|max:100',
            'disk'          => 'nullable|string|in:' . implode(',', StorageManager::availableDrivers()),
            'fileable_type' => 'nullable|string',
            'fileable_id'   => 'nullable|integer',
        ]);

        // Resolve owner if provided
        $owner = null;
        if ($request->fileable_type && $request->fileable_id) {
            $owner = $request->fileable_type::find($request->fileable_id);
        }

        $record = $this->fileService->upload(
            file: $request->file('file'),
            collection: $request->input('collection', 'general'),
            diskName: $request->input('disk'),
            owner: $owner
        );

        return response()->json([
            'id'            => $record->id,
            'original_name' => $record->original_name,
            'size'          => $record->size,
            'mime_type'     => $record->mime_type,
            'category'      => $record->category,
            'disk'          => $record->disk,
            'url'           => $record->getUrl(),
            'collection'    => $record->collection,
            'created_at'    => $record->created_at,
        ], 201);
    }

    /**
     * GET /api/files/{id}/url
     * Get a fresh URL for a file (for signed URL renewal)
     */
    public function getUrl(FileRecord $file)
    {
        $this->authorize('view', $file);
        return response()->json(['url' => $file->getUrl()]);
    }

    /**
     * DELETE /api/files/{id}
     */
    public function destroy(FileRecord $file)
    {
        $this->authorize('delete', $file);
        $this->fileService->delete($file);
        return response()->json(['message' => 'File deleted successfully.']);
    }

    /**
     * POST /api/files/{id}/migrate
     * Migrate a file from one disk to another
     */
    public function migrate(Request $request, FileRecord $file)
    {
        $request->validate([
            'target_disk' => 'required|string|in:' . implode(',', StorageManager::availableDrivers()),
        ]);

        $this->authorize('update', $file);
        $updated = $this->fileService->migrate($file, $request->target_disk);

        return response()->json([
            'id'   => $updated->id,
            'disk' => $updated->disk,
            'url'  => $updated->getUrl(),
        ]);
    }

    /**
     * GET /api/storage/disks
     * Return available disks (for admin UI)
     */
    public function availableDisks()
    {
        return response()->json([
            'disks'   => StorageManager::availableDrivers(),
            'default' => config('filesystems.default_upload_disk', 'local'),
        ]);
    }
}
```

**`routes/api.php` additions:**

```php
use App\Http\Controllers\Api\FileController;

Route::middleware('auth:sanctum')->group(function () {

    // File operations
    Route::post('/files/upload',         [FileController::class, 'upload']);
    Route::get('/files/{file}/url',      [FileController::class, 'getUrl']);
    Route::delete('/files/{file}',       [FileController::class, 'destroy']);
    Route::post('/files/{file}/migrate', [FileController::class, 'migrate']);

    // Admin
    Route::get('/storage/disks', [FileController::class, 'availableDisks']);
});
```

---

## 4. React Frontend Implementation

### 4.1 Universal Upload Hook: `useFileUpload.js`

```javascript
// front/src/hooks/useFileUpload.js
import { useState } from 'react';
import axiosClient from '../api/axiosClient'; // your existing axios instance

/**
 * Generic file upload hook.
 *
 * @param {Object} options
 * @param {string}  options.collection   - Backend collection name ('avatars', 'invoices', etc.)
 * @param {string}  [options.disk]       - Force a specific disk ('local' | 'google_drive' | null = default)
 * @param {string}  [options.fileableType] - e.g. 'App\\Models\\Invoice'
 * @param {number}  [options.fileableId]   - The owner model's ID
 * @param {Function} [options.onSuccess]   - Called with the FileRecord response
 * @param {Function} [options.onError]     - Called with the error
 */
export function useFileUpload({
  collection = 'general',
  disk = null,
  fileableType = null,
  fileableId = null,
  onSuccess,
  onError,
} = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);
  const [result, setResult]       = useState(null);

  const upload = async (file) => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection', collection);

    if (disk)         formData.append('disk', disk);
    if (fileableType) formData.append('fileable_type', fileableType);
    if (fileableId)   formData.append('fileable_id', fileableId);

    try {
      const response = await axiosClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(pct);
        },
      });

      setResult(response.data);
      onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed.';
      setError(msg);
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress, error, result };
}
```

### 4.2 Reusable Upload Component: `FileUploadButton.jsx`

```jsx
// front/src/components/shared/FileUploadButton.jsx
import { useRef } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';

export default function FileUploadButton({
  collection,
  disk,
  fileableType,
  fileableId,
  accept,
  label = 'Upload File',
  onSuccess,
  onError,
}) {
  const inputRef = useRef();
  const { upload, uploading, progress, error } = useFileUpload({
    collection,
    disk,
    fileableType,
    fileableId,
    onSuccess,
    onError,
  });

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) upload(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => inputRef.current.click()}
        disabled={uploading}
      >
        {uploading ? `Uploading... ${progress}%` : label}
      </button>

      {uploading && (
        <div style={{ width: '100%', background: '#eee', height: 4, marginTop: 8 }}>
          <div style={{ width: `${progress}%`, background: '#4f46e5', height: '100%' }} />
        </div>
      )}

      {error && <p style={{ color: 'red', fontSize: 12 }}>{error}</p>}
    </div>
  );
}
```

### 4.3 File Display Component: `FileDisplay.jsx`

```jsx
// front/src/components/shared/FileDisplay.jsx
// Works regardless of which disk the file is stored on.
import { useState } from 'react';
import axiosClient from '../../api/axiosClient';

export default function FileDisplay({ file, onDelete }) {
  const [url, setUrl]         = useState(file.url);
  const [deleting, setDeleting] = useState(false);

  // Refresh URL if it might have expired (for signed URLs)
  const refreshUrl = async () => {
    const res = await axiosClient.get(`/files/${file.id}/url`);
    setUrl(res.data.url);
    window.open(res.data.url, '_blank');
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this file?')) return;
    setDeleting(true);
    await axiosClient.delete(`/files/${file.id}`);
    onDelete?.(file.id);
  };

  const isImage = file.category === 'image';

  return (
    <div className="file-display">
      {isImage && <img src={url} alt={file.original_name} style={{ maxWidth: 120 }} />}

      <div className="file-info">
        <span>{file.original_name}</span>
        <span style={{ fontSize: 11, color: '#888' }}>
          {(file.size / 1024).toFixed(1)} KB — {file.disk}
        </span>
      </div>

      <div className="file-actions">
        <button onClick={refreshUrl}>View / Download</button>
        <button onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
```

### 4.4 Usage Examples in Existing Pages

**Avatar Upload (User Profile):**
```jsx
<FileUploadButton
  collection="avatars"
  fileableType="App\Models\User"
  fileableId={currentUser.id}
  accept="image/*"
  label="Change Profile Photo"
  onSuccess={(file) => setAvatarUrl(file.url)}
/>
```

**Invoice PDF Attachment:**
```jsx
<FileUploadButton
  collection="invoices"
  disk="google_drive"          // Force Google Drive for invoices
  fileableType="App\Models\Invoice"
  fileableId={invoice.id}
  accept=".pdf,.doc,.docx"
  label="Attach Document"
  onSuccess={(file) => addFileToInvoice(file)}
/>
```

**Product Images:**
```jsx
<FileUploadButton
  collection="products"
  fileableType="App\Models\Product"
  fileableId={product.id}
  accept="image/*"
  label="Upload Product Image"
  onSuccess={(file) => setProductImage(file)}
/>
```

---

## 5. Testing Scenarios Checklist

### 5.1 Backend Tests

**For each test, test BOTH disks: `local` AND `google_drive`.**

#### Unit: FileService
```
[ ] upload() creates a FileRecord row with correct disk, path, collection
[ ] upload() stores the file on the correct disk
[ ] upload() sets correct category (image/document/video/other)
[ ] upload() links to owner model (polymorphic) when provided
[ ] upload() sets uploaded_by from auth user
[ ] delete() removes the physical file from disk
[ ] delete() soft-deletes the FileRecord
[ ] migrate() moves file from local → google_drive successfully
[ ] migrate() updates disk column in FileRecord
[ ] migrate() clears cached_url and url_expires_at after migration
```

#### Unit: StorageManager
```
[ ] driver('local') returns LocalDriver instance
[ ] driver('google_drive') returns GoogleDriveDriver instance
[ ] driver('nonexistent') throws InvalidArgumentException
[ ] defaultDriver() returns driver matching DEFAULT_UPLOAD_DISK env
[ ] extend() registers a new custom driver
```

#### Unit: FileRecord Model
```
[ ] getUrl() returns a URL for local files
[ ] getUrl() returns a URL for google_drive files
[ ] getUrl() caches the URL and sets url_expires_at
[ ] getUrl() skips cache for local disk
[ ] getUrl() refreshes URL when url_expires_at is in the past
[ ] scopeOnDisk() filters correctly
[ ] scopeInCollection() filters correctly
```

#### Feature: API Endpoints
```
[ ] POST /api/files/upload — valid file → 201 with file data
[ ] POST /api/files/upload — no file → 422 validation error
[ ] POST /api/files/upload — invalid disk name → 422 validation error
[ ] POST /api/files/upload — disk=google_drive stores on GDrive
[ ] POST /api/files/upload — no disk uses DEFAULT_UPLOAD_DISK
[ ] POST /api/files/upload — links to fileable when fileable_type+id provided
[ ] GET /api/files/{id}/url — returns fresh URL
[ ] GET /api/files/{id}/url — 403 for unauthorized user
[ ] DELETE /api/files/{id} — deletes file and record
[ ] DELETE /api/files/{id} — 403 for unauthorized user
[ ] POST /api/files/{id}/migrate — migrates disk correctly
[ ] GET /api/storage/disks — returns available disks list
```

### 5.2 Integration: Each Feature that Uploads Files

Go through every place in your app that uploads files and test each scenario:

```
[ ] User profile avatar upload → stored in correct collection, linked to user
[ ] Invoice/document attachment → stored, linked to invoice
[ ] Product image upload → stored, linked to product
[ ] Company logo upload → stored, linked to company/settings
[ ] Import/CSV file upload → stored in 'imports' collection
[ ] PDF report generation & save → stored after generation
[ ] Signature/stamp image upload → stored correctly
[ ] Any chat/message attachment → stored correctly
[ ] Any other model that uses HasFiles trait
```

### 5.3 Frontend Tests

```
[ ] FileUploadButton shows progress bar during upload
[ ] FileUploadButton disables button during upload
[ ] FileUploadButton calls onSuccess with file data on success
[ ] FileUploadButton calls onError on failure
[ ] FileUploadButton resets input so same file can be re-uploaded
[ ] FileDisplay renders image preview for image files
[ ] FileDisplay shows correct filename and size
[ ] FileDisplay shows which disk the file is on
[ ] FileDisplay refreshes URL on "View/Download" click
[ ] FileDisplay triggers onDelete and removes from UI after delete
```

### 5.4 Edge Cases
```
[ ] Large file (test at max allowed size) — verify no timeout
[ ] Very long filename with special characters — verify safe storage name
[ ] Unsupported file type — verify validation rejects it
[ ] Concurrent uploads — verify no race condition in FileRecord creation
[ ] Google Drive auth token expiry — verify refresh token kicks in
[ ] Upload when Google Drive is unreachable — verify error is returned gracefully
[ ] URL cache expiry — verify URL is refreshed automatically
[ ] Soft-deleted record — verify getUrl() cannot be called on deleted record
[ ] File that exists on disk but not in DB — no orphaned file vulnerabilities
```

---

## 6. Migration Path / Future Providers

### Adding a New Storage Provider (e.g., AWS S3)

Only 3 steps needed:

**Step 1: Create the driver class**
```
app/Storage/Drivers/S3Driver.php
(implements StorageDriverInterface)
```

**Step 2: Register it in StorageManager**
```php
protected static array $drivers = [
    'local'        => LocalDriver::class,
    'google_drive' => GoogleDriveDriver::class,
    's3'           => S3Driver::class,  // ← ADD THIS LINE
];
```

**Step 3: Add disk config in filesystems.php**
```php
's3' => [
    'driver' => 's3',
    'key'    => env('AWS_ACCESS_KEY_ID'),
    // ...
],
```

**No other code changes needed.** All existing FileRecord rows, FileService, FileController, and React components work without modification.

---

## 7. Environment Variables Reference

```dotenv
# Default disk for all uploads (can be overridden per-request)
DEFAULT_UPLOAD_DISK=local

# Google Drive OAuth Credentials
GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token
GOOGLE_DRIVE_FOLDER=root_folder_id_or_leave_empty

# Future: AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-bucket-name
AWS_URL=

# Future: Dropbox
DROPBOX_ACCESS_TOKEN=
```

---

## Implementation Order (Recommended for Gemini Flash)

1. **Run migrations** → `file_records` table first
2. **Create `FileRecord` model + `HasFiles` trait**
3. **Create driver interface + `LocalDriver`** (test with local first)
4. **Create `StorageManager`**
5. **Create `FileService`**
6. **Create `FileController` + routes**
7. **Add `HasFiles` to all relevant models**
8. **Write and run backend tests for local disk** (all pass before moving on)
9. **Install Google Drive package, register in `AppServiceProvider`**
10. **Create `GoogleDriveDriver`**
11. **Run all backend tests again with `DEFAULT_UPLOAD_DISK=google_drive`**
12. **Build React `useFileUpload` hook**
13. **Build `FileUploadButton` and `FileDisplay` components**
14. **Replace every existing file upload in the app with `FileUploadButton`**
15. **Run full frontend testing checklist**
```