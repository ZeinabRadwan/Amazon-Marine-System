<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FileRecord;
use App\Models\StorageDisk;
use App\Services\FileService;
use App\Storage\StorageManager;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class FileController extends Controller
{
    use AuthorizesRequests;

    public function __construct(protected FileService $fileService) {}

    /**
     * POST /api/files/upload
     * Accepts: file (required), collection, disk, fileable_type, fileable_id
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file'          => 'required|file|max:102400', // 100MB max
            'collection'    => 'nullable|string|max:100',
            'disk'          => 'nullable|string|in:' . implode(',', StorageManager::availableDrivers()),
            'fileable_type' => 'nullable|string',
            'fileable_id'   => 'nullable|integer',
        ]);

        // Resolve owner if provided
        $owner = null;
        if ($request->fileable_type && $request->fileable_id) {
            $owner = $request->fileable_type::find($request->fileable_id);
        }

        $record = $this->fileService->upload(
            file: $request->file('file'),
            collection: $request->input('collection', 'general'),
            diskName: $request->input('disk'),
            owner: $owner
        );

        return response()->json([
            'id'            => $record->id,
            'original_name' => $record->original_name,
            'size'          => $record->size,
            'mime_type'     => $record->mime_type,
            'category'      => $record->category,
            'disk'          => $record->disk,
            'url'           => $record->getUrl(),
            'collection'    => $record->collection,
            'created_at'    => $record->created_at,
        ], 201);
    }

    /**
     * GET /api/files/{id}/url
     * Get a fresh URL for a file (for signed URL renewal)
     */
    public function getUrl(FileRecord $file)
    {
        $this->authorize('view', $file);
        return response()->json(['url' => $file->getUrl()]);
    }

    /**
     * DELETE /api/files/{id}
     */
    public function destroy(FileRecord $file)
    {
        $this->authorize('delete', $file);
        $this->fileService->delete($file);
        return response()->json(['message' => 'File deleted successfully.']);
    }

    /**
     * POST /api/files/{id}/migrate
     * Migrate a file from one disk to another
     */
    public function migrate(Request $request, FileRecord $file)
    {
        $request->validate([
            'target_disk' => 'required|string|in:' . implode(',', StorageManager::availableDrivers()),
        ]);

        $this->authorize('update', $file);
        $updated = $this->fileService->migrate($file, $request->target_disk);

        return response()->json([
            'id'   => $updated->id,
            'disk' => $updated->disk,
            'url'  => $updated->getUrl(),
        ]);
    }

    /**
     * GET /api/storage/disks
     * Return available disks (for admin UI)
     */
    public function availableDisks()
    {
        $dbDefault = StorageDisk::getDefaultDisk();
        return response()->json([
            'disks'   => StorageManager::availableDrivers(),
            'default' => $dbDefault ? $dbDefault->name : config('filesystems.default_upload_disk', 'local'),
            'db_default' => $dbDefault,
        ]);
    }
}
