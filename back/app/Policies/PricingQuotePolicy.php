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
        return $this->canManageQuotes($user);
    }

    public function update(User $user, PricingQuote $quote): bool
    {
        return $this->canManageQuotes($user);
    }

    public function accept(User $user, PricingQuote $quote): bool
    {
        return $this->canManageQuotes($user);
    }

    public function reject(User $user, PricingQuote $quote): bool
    {
        return $this->canManageQuotes($user);
    }

    public function delete(User $user, PricingQuote $quote): bool
    {
        return $this->canManageQuotes($user);
    }

    private function canManageQuotes(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('pricing');
    }
}
