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
