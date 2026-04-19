<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StorageDisk;
use App\Storage\StorageManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorageDiskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $disks = StorageDisk::all();
        return response()->json(['data' => $disks]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => 'required|string|unique:storage_disks,name',
            'driver' => 'required|string|in:local,google_drive,s3',
            'config' => 'required|array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'label' => 'nullable|string',
        ]);

        if ($validated['is_default'] ?? false) {
            StorageDisk::query()->update(['is_default' => false]);
        }

        $disk = StorageDisk::create($validated);

        return response()->json(['data' => $disk], 201);
    }

    public function update(Request $request, StorageDisk $storageDisk): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => 'sometimes|string|unique:storage_disks,name,' . $storageDisk->id,
            'driver' => 'sometimes|string|in:local,google_drive,s3',
            'config' => 'sometimes|array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'label' => 'nullable|string',
        ]);

        if ($validated['is_default'] ?? false) {
            StorageDisk::query()->where('id', '!=', $storageDisk->id)->update(['is_default' => false]);
        }

        $storageDisk->update($validated);

        return response()->json(['data' => $storageDisk]);
    }

    public function destroy(Request $request, StorageDisk $storageDisk): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($storageDisk->is_default) {
            return response()->json(['message' => 'Cannot delete the default storage disk.'], 422);
        }

        $storageDisk->delete();

        return response()->json(['message' => 'Storage disk deleted.']);
    }

    public function healthCheck(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $disks = StorageDisk::all();
        $results = $disks->map(function ($disk) {
            try {
                $driver = StorageManager::driver($disk->name);
                $canConnect = $driver->exists('/'); // Simple check
                return [
                    'id' => $disk->id,
                    'name' => $disk->name,
                    'status' => $canConnect ? 'healthy' : 'unhealthy',
                    'error' => null
                ];
            } catch (\Exception $e) {
                return [
                    'id' => $disk->id,
                    'name' => $disk->name,
                    'status' => 'error',
                    'error' => $e->getMessage()
                ];
            }
        });

        return response()->json(['data' => $results]);
    }

    private function authorizeAdmin(Request $request)
    {
        if (!$request->user()?->hasRole('admin')) {
            abort(403, 'Only admins can manage storage disks.');
        }
    }
}
