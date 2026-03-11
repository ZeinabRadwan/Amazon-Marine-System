<?php

namespace App\Policies;

use App\Models\PricingOffer;
use App\Models\User;

class PricingOfferPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('pricing.view_offers');
    }

    public function view(User $user, PricingOffer $offer): bool
    {
        return $user->can('pricing.view_offers');
    }

    public function create(User $user): bool
    {
        return $user->can('pricing.manage_offers');
    }

    public function update(User $user, PricingOffer $offer): bool
    {
        return $user->can('pricing.manage_offers');
    }

    public function activate(User $user, PricingOffer $offer): bool
    {
        return $user->can('pricing.manage_offers');
    }

    public function archive(User $user, PricingOffer $offer): bool
    {
        return $user->can('pricing.manage_offers');
    }
}

