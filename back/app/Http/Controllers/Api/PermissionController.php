<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PagePermission;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class PermissionController extends Controller
{
    /**
     * @return array<int, string>
     */
    private function pageKeysInOrder(): array
    {
        return array_keys(config('permissions.pages', []));
    }

    /**
     * @return array{name_ar: string, name_en: string}
     */
    private function resolvePageNames(string $page): array
    {
        $pageLabels = config('permissions.pages', []);
        $labels = $pageLabels[$page] ?? null;

        if (! is_array($labels)) {
            return [
                'name_ar' => $page,
                'name_en' => $page,
            ];
        }

        return [
            'name_ar' => (string) ($labels['name_ar'] ?? $page),
            'name_en' => (string) ($labels['name_en'] ?? $page),
        ];
    }

    public function index(Request $request)
    {
        abort_unless($request->user()?->can('permissions.view'), 403);

        $roles = Role::query()->orderBy('id')->get();
        $permissions = PagePermission::query()
            ->get();
        $pageKeys = $this->pageKeysInOrder();
        $permissionsByRolePage = $permissions->keyBy(function (PagePermission $permission): string {
            return $permission->role_id.'|'.$permission->page;
        });

        $data = [];
        foreach ($roles as $role) {
            foreach ($pageKeys as $pageKey) {
                /** @var PagePermission|null $permission */
                $permission = $permissionsByRolePage->get($role->id.'|'.$pageKey);
                $pageNames = $this->resolvePageNames($pageKey);

                $data[] = [
                    'id' => $permission?->id,
                    'role_id' => $role->id,
                    'role_name' => $role->name,
                    'role_name_ar' => $role->name_ar,
                    'role_name_en' => $role->name_en,
                    'page' => $pageKey,
                    'page_name_ar' => $pageNames['name_ar'],
                    'page_name_en' => $pageNames['name_en'],
                    'can_view' => (bool) ($permission?->can_view ?? false),
                ];
            }
        }

        return response()->json([
            'data' => $data,
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
        $pageNames = $this->resolvePageNames($permission->page);

        return response()->json([
            'data' => [
                'id' => $permission->id,
                'role_id' => $permission->role_id,
                'role_name' => $permission->role?->name,
                'role_name_ar' => $permission->role?->name_ar,
                'role_name_en' => $permission->role?->name_en,
                'page' => $permission->page,
                'page_name_ar' => $pageNames['name_ar'],
                'page_name_en' => $pageNames['name_en'],
                'can_view' => $permission->can_view,
            ],
        ], 201);
    }

    public function showByRole(Request $request, int $roleId)
    {
        abort_unless($request->user()?->can('permissions.view'), 403);

        $role = Role::query()->findOrFail($roleId);
        $permissions = PagePermission::query()
            ->where('role_id', $roleId)
            ->get();
        $permissionsByPage = $permissions->keyBy('page');
        $pageKeys = $this->pageKeysInOrder();

        return response()->json([
            'data' => collect($pageKeys)->map(function (string $pageKey) use ($permissionsByPage, $role): array {
                /** @var PagePermission|null $permission */
                $permission = $permissionsByPage->get($pageKey);
                $pageNames = $this->resolvePageNames($pageKey);

                return [
                    'id' => $permission?->id,
                    'role_id' => $role->id,
                    'role_name' => $role->name,
                    'role_name_ar' => $role->name_ar,
                    'role_name_en' => $role->name_en,
                    'page' => $pageKey,
                    'page_name_ar' => $pageNames['name_ar'],
                    'page_name_en' => $pageNames['name_en'],
                    'can_view' => (bool) ($permission?->can_view ?? false),
                ];
            })->all(),
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
