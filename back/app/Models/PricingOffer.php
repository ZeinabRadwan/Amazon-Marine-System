<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class PricingOffer extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'pricing_type',
        'region',
        'pod',
        'shipping_line',
        'pol',
        'dnd',
        'transit_time',
        'inland_port',
        'destination',
        'inland_gov',
        'inland_city',
        'valid_from',
        'weekly_sailing_days',
        'valid_to',
        'status',
        'other_charges',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
    ];

    public function isExpired(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        if ($this->valid_to === null) {
            return false;
        }

        return $this->valid_to->startOfDay()->lt(now()->startOfDay());
    }

    public function isQuotable(): bool
    {
        return $this->status === 'active' && ! $this->isExpired();
    }

    /**
     * UI / API lifecycle: draft | active | expired | archived
     */
    public function displayStatus(): string
    {
        if ($this->status === 'draft') {
            return 'draft';
        }

        if ($this->status === 'archived') {
            return 'archived';
        }

        if ($this->isExpired()) {
            return 'expired';
        }

        return 'active';
    }

    /**
     * @return HasMany<PricingOfferItem>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PricingOfferItem::class);
    }

    /**
     * @return HasMany<PricingOfferSailingDate>
     */
    public function sailingDates(): HasMany
    {
        return $this->hasMany(PricingOfferSailingDate::class);
    }

    /**
     * @return HasMany<PricingOfferSnapshot>
     */
    public function snapshots(): HasMany
    {
        return $this->hasMany(PricingOfferSnapshot::class, 'pricing_offer_id');
    }
}
