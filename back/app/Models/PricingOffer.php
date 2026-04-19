<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Traits\HasFiles;

class PricingOffer extends Model
{
    use HasFactory, HasFiles;

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
        'valid_to',
        'status',
        'other_charges',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'valid_to' => 'date',
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

