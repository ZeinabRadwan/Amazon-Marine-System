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
        'container_type',
        'container_size',
        'container_height',
        'region',
        'pod',
        'shipping_line',
        'pol',
        'dnd',
        'transit_time',
        'free_time',
        'inland_port',
        'destination',
        'inland_gov',
        'inland_city',
        'valid_from',
        'valid_to',
        'status',
        'other_charges',
        'available_sailing_days',
        'weekly_sailings',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
        'available_sailing_days' => 'array',
    ];

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
}

