<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\User;

class ClientPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('clients.view') || $user->can('pricing.view_client_pricing');
    }

    public function view(User $user, Client $client): bool
    {
        return $user->can('clients.view') || $user->can('pricing.view_client_pricing');
    }

    public function create(User $user): bool
    {
        return $user->can('clients.manage');
    }

    public function update(User $user, Client $client): bool
    {
        if ($user->can('pricing.manage_client_pricing')) {
            return true;
        }

        if (! $user->can('clients.manage')) {
            return false;
        }

        if ($user->hasRole('admin') || $user->hasRole('sales_manager')) {
            return true;
        }

        if ($user->hasRole('sales') && $client->assigned_sales_id === $user->id) {
            return true;
        }

        return false;
    }

    public function delete(User $user, Client $client): bool
    {
        return $this->update($user, $client);
    }
}

