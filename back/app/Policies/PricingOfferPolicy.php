<?php

namespace App\Policies;

use App\Models\PricingOffer;
use App\Models\User;

class PricingOfferPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasPermissionTo('pricing.view_offers');
    }

    public function view(User $user, PricingOffer $offer): bool
    {
        return $user->hasRole('admin') || $user->hasPermissionTo('pricing.view_offers');
    }

    public function create(User $user): bool
    {
        return $this->canManageOffers($user);
    }

    public function update(User $user, PricingOffer $offer): bool
    {
        return $this->canManageOffers($user);
    }

    public function activate(User $user, PricingOffer $offer): bool
    {
        return $this->canManageOffers($user);
    }

    public function archive(User $user, PricingOffer $offer): bool
    {
        return $this->canManageOffers($user);
    }

    public function delete(User $user, PricingOffer $offer): bool
    {
        return $this->canManageOffers($user);
    }

    private function canManageOffers(User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasAnyRole(['sales', 'sales_manager'])) {
            return false;
        }

        return $user->hasRole('pricing') || $user->hasPermissionTo('pricing.manage_offers');
    }
}
