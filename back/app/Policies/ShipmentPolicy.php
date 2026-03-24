<?php

namespace App\Policies;

use App\Models\Shipment;
use App\Models\User;

class ShipmentPolicy
{
    public function viewAny(User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('shipments.view') || $user->can('shipments.view_own');
    }

    public function view(User $user, Shipment $shipment): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->can('shipments.view')) {
            return true;
        }

        return $user->can('shipments.view_own') && $shipment->sales_rep_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') || $user->can('shipments.manage_ops');
    }

    public function update(User $user, Shipment $shipment): bool
    {
        return $user->hasRole('admin') || $user->can('shipments.manage_ops');
    }

    public function delete(User $user, Shipment $shipment): bool
    {
        return $user->hasRole('admin') || $user->can('shipments.manage_ops');
    }
}
