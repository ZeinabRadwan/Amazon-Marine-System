<?php

namespace App\Policies;

use App\Models\PricingQuote;
use App\Models\User;

class PricingQuotePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin') || $user->can('pricing.view_quotes');
    }

    public function view(User $user, PricingQuote $quote): bool
    {
        return $user->hasRole('admin') || $user->can('pricing.view_quotes');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') || $user->can('pricing.manage_quotes');
    }

    public function update(User $user, PricingQuote $quote): bool
    {
        return $user->hasRole('admin') || $user->can('pricing.manage_quotes');
    }

    public function accept(User $user, PricingQuote $quote): bool
    {
        return $user->hasRole('admin') || $user->can('pricing.manage_quotes');
    }

    public function reject(User $user, PricingQuote $quote): bool
    {
        return $user->hasRole('admin') || $user->can('pricing.manage_quotes');
    }
}
