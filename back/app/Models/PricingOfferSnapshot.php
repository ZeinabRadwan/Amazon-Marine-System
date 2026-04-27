<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PricingOfferSnapshot extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'pricing_offer_id',
        'snapshot_data',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'snapshot_data' => 'array',
    ];

    /**
     * @return BelongsTo<PricingOffer, PricingOfferSnapshot>
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(PricingOffer::class, 'pricing_offer_id');
    }

    /**
     * @return HasMany<PricingQuote>
     */
    public function quotes(): HasMany
    {
        return $this->hasMany(PricingQuote::class, 'origin_rate_snapshot_id');
    }
}

