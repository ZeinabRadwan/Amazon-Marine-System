<?php

namespace App\Storage;

use App\Storage\Contracts\StorageDriverInterface;
use App\Storage\Drivers\LocalDriver;
use App\Storage\Drivers\GoogleDriveDriver;
use InvalidArgumentException;

class StorageManager
{
    /**
     * Driver registry.
     */
    protected static array $drivers = [
        'local'        => LocalDriver::class,
        'google_drive' => GoogleDriveDriver::class,
    ];

    /**
     * Resolved instances.
     */
    protected static array $resolved = [];

    /**
     * Get a driver instance by disk name.
     */
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

    /**
     * Get the default driver from config.
     */
    public static function defaultDriver(): StorageDriverInterface
    {
        $disk = config('filesystems.default_upload_disk', 'local');
        return self::driver($disk);
    }

    /**
     * Register a new driver at runtime.
     */
    public static function extend(string $diskName, string $driverClass): void
    {
        self::$drivers[$diskName] = $driverClass;
    }

    /**
     * Get all available driver names.
     */
    public static function availableDrivers(): array
    {
        return array_keys(self::$drivers);
    }
}
