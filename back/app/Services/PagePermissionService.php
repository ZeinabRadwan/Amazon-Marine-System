<?php

namespace App\Services;

use App\Models\PagePermission;
use App\Models\User;
use Illuminate\Support\Collection;

class PagePermissionService
{
    public function can(User $user, string $page, string $action): bool
    {
        if ($action !== 'view' && $action !== 'edit' && $action !== 'delete' && $action !== 'approve') {
            return false;
        }

        $roleIds = $user->roles()->pluck('id');

        if ($roleIds->isEmpty()) {
            return false;
        }

        /** @var Collection<int, PagePermission> $permissions */
        $permissions = PagePermission::query()
            ->whereIn('role_id', $roleIds)
            ->where('page', $page)
            ->get();

        if ($permissions->isEmpty()) {
            return false;
        }

        return $permissions->contains(function (PagePermission $permission): bool {
            return (bool) $permission->can_view;
        });
    }
}
