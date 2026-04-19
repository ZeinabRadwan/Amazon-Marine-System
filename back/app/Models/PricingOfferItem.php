<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PricingOfferItem extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'pricing_offer_id',
        'code',
        'name',
        'description',
        'price',
        'currency_code',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'price' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<PricingOffer, PricingOfferItem>
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(PricingOffer::class, 'pricing_offer_id');
    }
}

