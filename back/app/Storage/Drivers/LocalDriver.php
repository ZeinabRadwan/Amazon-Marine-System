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
