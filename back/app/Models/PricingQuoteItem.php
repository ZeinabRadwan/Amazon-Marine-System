<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PricingQuoteItem extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'pricing_quote_id',
        'source_item_id',
        'code',
        'name',
        'description',
        'cost_amount',
        'selling_amount',
        'amount',
        'currency_code',
        'sort_order',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'cost_amount' => 'decimal:2',
        'selling_amount' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<PricingQuote, PricingQuoteItem>
     */
    public function quote(): BelongsTo
    {
        return $this->belongsTo(PricingQuote::class, 'pricing_quote_id');
    }

    /**
     * @return BelongsTo<PricingOfferItem, PricingQuoteItem>
     */
    public function sourceItem(): BelongsTo
    {
        return $this->belongsTo(PricingOfferItem::class, 'source_item_id');
    }
}

