<?php

namespace App\Services;

use App\Models\PagePermission;
use App\Models\User;
use Illuminate\Support\Collection;

class PagePermissionService
{
    public function can(User $user, string $page, string $action): bool
    {
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

        $column = $this->actionToColumn($action);

        if ($column === null) {
            return false;
        }

        return $permissions->contains(function (PagePermission $permission) use ($column): bool {
            return (bool) $permission->{$column};
        });
    }

    private function actionToColumn(string $action): ?string
    {
        return match ($action) {
            'view' => 'can_view',
            'edit' => 'can_edit',
            'delete' => 'can_delete',
            'approve' => 'can_approve',
            default => null,
        };
    }
}

