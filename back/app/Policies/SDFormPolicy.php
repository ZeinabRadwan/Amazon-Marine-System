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

    /**
     * Operations / admin: upload booking confirmation from Shipments toolbar (any SD form).
     */
    public function uploadBookingConfirmation(User $user, SDForm $form): bool
    {
        return $user->hasRole('admin') || $user->hasRole('operations');
    }

    public function view(User $user, SDForm $form): bool
    {
        if ($user->can('sd_forms.view')) {
            return true;
        }

        if ($user->can('sd_forms.manage') && $form->sales_rep_id === $user->id) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        if (! $user->can('sd_forms.manage')) {
            return false;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        return ! $user->hasRole('operations');
    }

    public function update(User $user, SDForm $form): bool
    {
        if (! $user->can('sd_forms.manage')) {
            return false;
        }

        if ($user->can('sd_forms.manage_any')) {
            return true;
        }

        return $form->sales_rep_id === $user->id;
    }

    public function delete(User $user, SDForm $form): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('operations')) {
            return false;
        }

        return $this->update($user, $form);
    }
}
