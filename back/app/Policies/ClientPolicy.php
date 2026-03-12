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
        return $user->can('pricing.manage_client_pricing') || $user->can('clients.manage');
    }

    public function delete(User $user, Client $client): bool
    {
        return $user->can('clients.delete');
    }
}
