<?php

namespace App\Traits;

use App\Models\FileRecord;

trait HasFiles
{
    /**
     * Get all files for the model.
     */
    public function files()
    {
        return $this->morphMany(FileRecord::class, 'fileable');
    }

    /**
     * Get files in a specific collection.
     */
    public function filesByCollection(string $collection)
    {
        return $this->files()->where('collection', $collection);
    }

    /**
     * Get the latest file in a collection.
     */
    public function singleFile(string $collection)
    {
        return $this->files()->where('collection', $collection)->latest()->first();
    }
}
