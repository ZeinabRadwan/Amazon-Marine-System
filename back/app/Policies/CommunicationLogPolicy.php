<?php

namespace App\Policies;

use App\Models\CommunicationLog;
use App\Models\User;

class CommunicationLogPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('customer_service.view_comms');
    }

    public function view(User $user, CommunicationLog $communicationLog): bool
    {
        return $user->can('customer_service.view_comms');
    }

    public function create(User $user): bool
    {
        return $user->can('customer_service.manage_comms');
    }

    public function update(User $user, CommunicationLog $communicationLog): bool
    {
        return $user->can('customer_service.manage_comms');
    }

    public function delete(User $user, CommunicationLog $communicationLog): bool
    {
        return $user->can('customer_service.manage_comms');
    }
}
