<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FileRecord;
use App\Services\FileService;
use App\Storage\StorageManager;
use Illuminate\Http\Request;

class FileController extends Controller
{
    public function __construct(protected FileService $fileService) {}

    /**
     * POST /api/files/upload
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file'          => 'required|file|max:102400', // 100MB
            'collection'    => 'nullable|string|max:100',
            'disk'          => 'nullable|string|in:' . implode(',', StorageManager::availableDrivers()),
            'fileable_type' => 'nullable|string',
            'fileable_id'   => 'nullable|integer',
        ]);

        $owner = null;
        if ($request->fileable_type && $request->fileable_id) {
            // Potentially check if class exists and is a model
            if (class_exists($request->fileable_type)) {
                $owner = $request->fileable_type::find($request->fileable_id);
            }
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
     */
    public function getUrl(FileRecord $file)
    {
        // Add authorization check if needed
        return response()->json(['url' => $file->getUrl()]);
    }

    /**
     * DELETE /api/files/{id}
     */
    public function destroy(FileRecord $file)
    {
        // Add authorization check if needed
        $this->fileService->delete($file);
        return response()->json(['message' => __('File deleted successfully.')]);
    }

    /**
     * POST /api/files/{id}/migrate
     */
    public function migrate(Request $request, FileRecord $file)
    {
        $request->validate([
            'target_disk' => 'required|string|in:' . implode(',', StorageManager::availableDrivers()),
        ]);

        $updated = $this->fileService->migrate($file, $request->target_disk);

        return response()->json([
            'id'   => $updated->id,
            'disk' => $updated->disk,
            'url'  => $updated->getUrl(),
        ]);
    }

    /**
     * GET /api/storage/disks
     */
    public function availableDisks()
    {
        return response()->json([
            'disks'   => StorageManager::availableDrivers(),
            'default' => config('filesystems.default_upload_disk', 'local'),
        ]);
    }
}
