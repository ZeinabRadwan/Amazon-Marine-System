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
