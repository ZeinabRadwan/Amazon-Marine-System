<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StorageDisk extends Model
{
    protected $fillable = [
        'name',
        'driver',
        'config',
        'is_active',
        'is_default',
        'label',
    ];

    protected $casts = [
        'config' => 'array',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    /**
     * Get the default disk for the application.
     */
    public static function getDefaultDisk(): ?self
    {
        return self::where('is_active', true)->where('is_default', true)->first();
    }
}
