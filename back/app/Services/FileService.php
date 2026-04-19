<?php

namespace App\Services;

use App\Models\FileRecord;
use App\Models\StorageDisk;
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
        if (!$diskName) {
            $dbDisk = StorageDisk::getDefaultDisk();
            $diskName = $dbDisk ? $dbDisk->name : config('filesystems.default_upload_disk', 'local');
        }
        
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
