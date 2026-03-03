<?php

namespace App\Policies;

use App\Models\Shipment;
use App\Models\User;

class ShipmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('shipments.view');
    }

    public function view(User $user, Shipment $shipment): bool
    {
        if ($user->can('shipments.view')) {
            return true;
        }

        if ($user->hasRole('sales') && $shipment->sales_rep_id === $user->id) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('shipments.manage_ops');
    }

    public function update(User $user, Shipment $shipment): bool
    {
        return $user->can('shipments.manage_ops');
    }

    public function delete(User $user, Shipment $shipment): bool
    {
        return $user->can('shipments.manage_ops');
    }
}

