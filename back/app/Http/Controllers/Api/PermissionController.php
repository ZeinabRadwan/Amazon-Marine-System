<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PagePermission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('permissions.view'), 403);

        $permissions = PagePermission::query()
            ->with('role')
            ->orderBy('role_id')
            ->orderBy('page')
            ->get();

        return response()->json([
            'data' => $permissions->map(function (PagePermission $permission): array {
                return [
                    'id' => $permission->id,
                    'role_id' => $permission->role_id,
                    'role_name' => $permission->role?->name,
                    'role_name_ar' => $permission->role?->name_ar,
                    'role_name_en' => $permission->role?->name_en,
                    'page' => $permission->page,
                    'can_view' => $permission->can_view,
                ];
            }),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->can('permissions.manage'), 403);

        $validated = $request->validate([
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'page' => ['required', 'string', 'max:255'],
            'can_view' => ['required', 'boolean'],
        ]);

        $permission = PagePermission::updateOrCreate(
            [
                'role_id' => $validated['role_id'],
                'page' => $validated['page'],
            ],
            [
                'can_view' => $validated['can_view'],
            ],
        );

        $permission->load('role');

        return response()->json([
            'data' => [
                'id' => $permission->id,
                'role_id' => $permission->role_id,
                'role_name' => $permission->role?->name,
                'role_name_ar' => $permission->role?->name_ar,
                'role_name_en' => $permission->role?->name_en,
                'page' => $permission->page,
                'can_view' => $permission->can_view,
            ],
        ], 201);
    }

    public function showByRole(Request $request, int $roleId)
    {
        abort_unless($request->user()?->can('permissions.view'), 403);

        $permissions = PagePermission::query()
            ->where('role_id', $roleId)
            ->orderBy('page')
            ->get();

        return response()->json([
            'data' => $permissions->map(function (PagePermission $permission): array {
                return [
                    'id' => $permission->id,
                    'role_id' => $permission->role_id,
                    'page' => $permission->page,
                    'can_view' => $permission->can_view,
                ];
            }),
        ]);
    }

    public function destroy(Request $request, PagePermission $permission)
    {
        abort_unless($request->user()?->can('permissions.manage'), 403);

        $permission->delete();

        return response()->json([
            'message' => __('Permission removed.'),
        ]);
    }
}
