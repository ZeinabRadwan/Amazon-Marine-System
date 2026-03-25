<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('roles.view'), 403);

        $roles = Role::with('permissions')->get();

        return response()->json([
            'data' => $roles->map(function (Role $role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions' => $role->permissions->pluck('name'),
                ];
            }),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->can('roles.manage'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create([
            'name' => $validated['name'],
        ]);

        if (! empty($validated['permissions'])) {
            $permissions = Permission::whereIn('name', $validated['permissions'])->get();
            $role->syncPermissions($permissions);
        }

        return response()->json([
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
            ],
        ], 201);
    }

    public function update(Request $request, Role $role)
    {
        abort_unless($request->user()?->can('roles.manage'), 403);

        if ($role->name === 'admin') {
            return response()->json([
                'message' => __('The admin role cannot be modified.'),
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'unique:roles,name,' . $role->id],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        if (array_key_exists('name', $validated)) {
            $role->name = $validated['name'];
        }

        $role->save();

        if (array_key_exists('permissions', $validated)) {
            $permissions = Permission::whereIn('name', $validated['permissions'])->get();
            $role->syncPermissions($permissions);
        }

        $role->load('permissions');

        return response()->json([
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
            ],
        ]);
    }

    public function destroy(Request $request, Role $role)
    {
        abort_unless($request->user()?->can('roles.manage'), 403);

        if ($role->name === 'admin') {
            return response()->json([
                'message' => __('The admin role cannot be deleted.'),
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => __('Role deleted.'),
        ]);
    }
}
