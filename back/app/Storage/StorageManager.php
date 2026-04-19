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
