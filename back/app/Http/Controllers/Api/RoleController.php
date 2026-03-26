<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * @return array<string, mixed>
     */
    private function transformRole(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'name_ar' => $role->name_ar,
            'name_en' => $role->name_en,
            'guard_name' => $role->guard_name,
        ];
    }

    public function index(Request $request)
    {
        abort_unless($request->user()?->can('roles.view'), 403);

        $roles = Role::query()->orderBy('id')->get();

        return response()->json([
            'data' => $roles->map(fn (Role $role): array => $this->transformRole($role)),
        ]);
    }

    public function show(Request $request, Role $role)
    {
        abort_unless($request->user()?->can('roles.view'), 403);

        return response()->json([
            'data' => $this->transformRole($role),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->can('roles.manage'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'name_ar' => ['required', 'string', 'max:255'],
            'name_en' => ['required', 'string', 'max:255'],
        ]);

        $role = new Role;
        $role->name = $validated['name'];
        $role->name_ar = $validated['name_ar'];
        $role->name_en = $validated['name_en'];
        $role->guard_name = 'web';
        $role->save();

        return response()->json([
            'data' => $this->transformRole($role),
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
            'name' => ['sometimes', 'string', 'max:255', 'unique:roles,name,'.$role->id],
            'name_ar' => ['sometimes', 'string', 'max:255'],
            'name_en' => ['sometimes', 'string', 'max:255'],
        ]);

        if (array_key_exists('name', $validated)) {
            $role->name = $validated['name'];
        }

        if (array_key_exists('name_ar', $validated)) {
            $role->name_ar = $validated['name_ar'];
        }

        if (array_key_exists('name_en', $validated)) {
            $role->name_en = $validated['name_en'];
        }

        $role->save();

        return response()->json([
            'data' => $this->transformRole($role),
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
