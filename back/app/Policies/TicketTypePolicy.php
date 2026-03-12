<?php

namespace App\Policies;

use App\Models\TicketType;
use App\Models\User;

class TicketTypePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tickets.view');
    }

    public function view(User $user, TicketType $ticketType): bool
    {
        return $user->can('tickets.view');
    }

    public function create(User $user): bool
    {
        return $user->can('tickets.manage');
    }

    public function update(User $user, TicketType $ticketType): bool
    {
        return $user->can('tickets.manage');
    }

    public function delete(User $user, TicketType $ticketType): bool
    {
        return $user->can('tickets.manage');
    }
}
