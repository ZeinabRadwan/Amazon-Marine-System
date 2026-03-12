<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tickets.view');
    }

    public function view(User $user, Ticket $ticket): bool
    {
        if ($user->can('tickets.view')) {
            return true;
        }

        if ($ticket->created_by_id === $user->id || $ticket->assigned_to_id === $user->id) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('tickets.manage');
    }

    public function update(User $user, Ticket $ticket): bool
    {
        if ($user->can('tickets.manage')) {
            return true;
        }

        return $ticket->created_by_id === $user->id;
    }

    public function delete(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.manage');
    }
}
