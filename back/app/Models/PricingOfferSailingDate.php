<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PricingOfferSailingDate extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'pricing_offer_id',
        'sailing_date',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'sailing_date' => 'date',
    ];

    /**
     * @return BelongsTo<PricingOffer, PricingOfferSailingDate>
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(PricingOffer::class, 'pricing_offer_id');
    }
}

