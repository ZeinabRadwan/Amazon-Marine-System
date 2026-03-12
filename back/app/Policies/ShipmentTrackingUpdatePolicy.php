<?php

namespace App\Policies;

use App\Models\ShipmentTrackingUpdate;
use App\Models\User;

class ShipmentTrackingUpdatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('customer_service.view_tracking_updates');
    }

    public function view(User $user, ShipmentTrackingUpdate $shipmentTrackingUpdate): bool
    {
        return $user->can('customer_service.view_tracking_updates');
    }

    public function create(User $user): bool
    {
        return $user->can('customer_service.manage_tracking_updates');
    }
}
