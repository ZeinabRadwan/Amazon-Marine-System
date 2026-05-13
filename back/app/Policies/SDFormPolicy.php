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
     * Operations / admin: upload booking confirmation files attached to any SD form.
     */
    public function uploadBookingConfirmation(User $user, SDForm $form): bool
    {
        return $user->hasRole('admin') || $user->hasRole('operations');
    }

    /**
     * Operations / admin: confirm or cancel the booking from an SD form row action.
     *
     * Confirm/cancel is allowed once a form has reached the operations stage.
     */
    public function decideBooking(User $user, SDForm $form): bool
    {
        if (! ($user->hasRole('admin') || $user->hasRole('operations'))) {
            return false;
        }

        return in_array($form->status, [
            'sent_to_operations',
            'in_progress',
            'booking_confirmed',
            'booking_cancelled',
        ], true);
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

        // Once an SD form has been converted to an active shipment, only an admin
        // may make further edits (after explicitly reopening it).
        if ($form->status === 'converted_to_shipment' && ! $user->hasRole('admin')) {
            return false;
        }

        if ($user->can('sd_forms.manage_any')) {
            return true;
        }

        return $form->sales_rep_id === $user->id;
    }

    /**
     * Admin or the original sales rep marks the SD form as fully completed
     * and converted to an active shipment.
     */
    public function convertToShipment(User $user, SDForm $form): bool
    {
        if (! $user->can('sd_forms.manage')) {
            return false;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        // The owning sales rep (or sales manager with manage_any) may also convert.
        if ($user->can('sd_forms.manage_any')) {
            return true;
        }

        return $form->sales_rep_id === $user->id;
    }

    /**
     * Only an admin may reopen an SD form that has already been converted to a shipment.
     */
    public function reopenFromConverted(User $user, SDForm $form): bool
    {
        return $user->hasRole('admin') && $form->status === 'converted_to_shipment';
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
