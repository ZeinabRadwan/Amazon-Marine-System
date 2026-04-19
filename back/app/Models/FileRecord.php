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
