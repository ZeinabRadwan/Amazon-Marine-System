<?php

namespace App\Traits;

use App\Models\FileRecord;

trait HasFiles
{
    public function files()
    {
        return $this->morphMany(FileRecord::class, 'fileable');
    }

    public function filesByCollection(string $collection)
    {
        return $this->files()->where('collection', $collection);
    }

    public function singleFile(string $collection)
    {
        return $this->files()->where('collection', $collection)->latest()->first();
    }
}
