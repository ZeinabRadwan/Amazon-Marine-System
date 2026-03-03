<?php

namespace App\Policies;

use App\Models\SDForm;
use App\Models\User;

class SDFormPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('sd_forms.view');
    }

    public function view(User $user, SDForm $form): bool
    {
        if ($user->can('sd_forms.view')) {
            return true;
        }

        if ($user->hasRole('sales') && $form->sales_rep_id === $user->id) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('sd_forms.manage');
    }

    public function update(User $user, SDForm $form): bool
    {
        if (! $user->can('sd_forms.manage')) {
            return false;
        }

        if ($user->hasRole('admin') || $user->hasRole('sales_manager')) {
            return true;
        }

        if ($user->hasRole('sales') && $form->sales_rep_id === $user->id) {
            return true;
        }

        return false;
    }

    public function delete(User $user, SDForm $form): bool
    {
        return $this->update($user, $form);
    }
}

