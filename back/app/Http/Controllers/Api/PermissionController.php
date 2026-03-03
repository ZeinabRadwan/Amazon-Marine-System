<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('permissions.view'), 403);

        $permissions = Permission::all()->sortBy('name')->values();

        return response()->json([
            'data' => $permissions->map(function (Permission $permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'guard_name' => $permission->guard_name,
                ];
            }),
        ]);
    }
}
