<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.view');
    }

    public function view(User $user, User $model): bool
    {
        return $user->can('users.view');
    }

    public function create(User $user): bool
    {
        return $user->can('users.manage');
    }

    public function update(User $user, User $model): bool
    {
        if (! $user->can('users.manage')) {
            return false;
        }

        if ($model->hasRole('admin') && ! $user->can('users.manage_admins')) {
            return false;
        }

        return true;
    }

    public function delete(User $user, User $model): bool
    {
        if (! $user->can('users.manage')) {
            return false;
        }

        // Prevent deleting self or admin users (except by another admin)
        if ($user->id === $model->id) {
            return false;
        }

        if ($model->hasRole('admin') && ! $user->can('users.manage_admins')) {
            return false;
        }

        return true;
    }
}
