<?php

namespace App\Storage\Drivers;

use App\Storage\Contracts\StorageDriverInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class GoogleDriveDriver implements StorageDriverInterface
{
    public function store(UploadedFile $file, string $directory): string
    {
        $path = $directory . '/' . $file->hashName();
        Storage::disk('google_drive')->put($path, file_get_contents($file));
        return $path;
    }

    public function url(string $path, ?int $expiresInMinutes = null): string
    {
        // For Google Drive, the adapter suele return a direct link if configured
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
        try {
            $adapter = Storage::disk('google_drive')->getAdapter();
            // The masbug adapter provides getFileId
            $fileId = $adapter->getFileId($path);
            return [
                'file_id'       => $fileId,
                'web_view_link' => "https://drive.google.com/file/d/{$fileId}/view",
            ];
        } catch (\Throwable $e) {
            return [];
        }
    }
}
