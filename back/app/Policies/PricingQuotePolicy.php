<?php

namespace App\Policies;

use App\Models\PricingQuote;
use App\Models\User;

class PricingQuotePolicy
{
    public function viewAny(User $user): bool
    {
        return $this->canViewQuotes($user);
    }

    public function view(User $user, PricingQuote $quote): bool
    {
        return $this->canViewQuotes($user);
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

    private function canViewQuotes(User $user): bool
    {
        return $user->hasRole('admin')
            || $user->hasRole('sales')
            || $user->hasRole('sales_manager')
            || $user->can('pricing.view_quotes');
    }

    private function canManageQuotes(User $user): bool
    {
        return $user->hasRole('admin')
            || $user->hasRole('sales')
            || $user->hasRole('sales_manager')
            || $user->can('pricing.manage_quotes');
    }
}
