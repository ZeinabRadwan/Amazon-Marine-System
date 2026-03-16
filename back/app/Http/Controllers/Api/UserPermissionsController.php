<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Http\Request;

class UserPermissionsController extends Controller
{
    /**
     * GET /users-with-permissions – list users with role and effective permission status.
     */
    public function index(Request $request)
    {
        $request->user()?->can('users.view') || abort(403);

        $users = User::with(['roles', 'permissionOverrides'])
            ->orderBy('name')
            ->get();

        $data = $users->map(function (User $user) {
            $roleNames = $user->getRoleNames();
            $primaryRole = $user->roles->first()?->name;
            $effective = $user->getEffectivePermissionNames();
            $overrides = $user->permissionOverrides->map(fn ($p) => [
                'permission' => $p->name,
                'allowed' => (bool) $p->pivot->allowed,
            ]);

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'roles' => $roleNames,
                'primary_role' => $primaryRole,
                'effective_permissions' => $effective,
                'overrides' => $overrides,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * GET /users/{id}/permissions – get user's permissions (role + overrides + effective).
     */
    public function show(Request $request, User $user)
    {
        $request->user()?->can('users.view') || abort(403);

        $user->load(['roles', 'permissionOverrides']);
        $rolePermissions = $user->getPermissionsViaRoles()->pluck('name')->values()->all();
        $overrides = $user->permissionOverrides->map(fn ($p) => [
            'permission_id' => $p->id,
            'permission' => $p->name,
            'allowed' => (bool) $p->pivot->allowed,
        ])->values()->all();
        $effective = $user->getEffectivePermissionNames();

        return response()->json([
            'data' => [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'primary_role' => $user->roles->first()?->name,
                'role_permissions' => $rolePermissions,
                'overrides' => $overrides,
                'effective_permissions' => $effective,
            ],
        ]);
    }

    /**
     * PUT /users/{id}/permissions – set user-level permission overrides.
     * Body: { "permissions": [ { "name": "clients.view", "allowed": true }, ... ] }
     */
    public function update(Request $request, User $user)
    {
        $request->user()?->can('users.manage') || abort(403);

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*.name' => ['required', 'string', 'exists:permissions,name'],
            'permissions.*.allowed' => ['required', 'boolean'],
        ]);

        $permissionIds = \Spatie\Permission\Models\Permission::whereIn('name', collect($validated['permissions'])->pluck('name'))->pluck('id', 'name');

        $user->permissionOverrides()->detach();

        foreach ($validated['permissions'] as $p) {
            $id = $permissionIds[$p['name']] ?? null;
            if ($id !== null) {
                $user->permissionOverrides()->attach($id, ['allowed' => $p['allowed']]);
            }
        }

        return $this->show($request, $user->fresh(['roles', 'permissionOverrides']));
    }

    /**
     * POST /users/{id}/permissions/reset – reset user to role default (clear overrides).
     */
    public function reset(Request $request, User $user)
    {
        $request->user()?->can('users.manage') || abort(403);

        $user->permissionOverrides()->detach();

        return $this->show($request, $user->fresh(['roles', 'permissionOverrides']));
    }
}
