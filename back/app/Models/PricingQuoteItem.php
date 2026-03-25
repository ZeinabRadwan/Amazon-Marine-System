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
        'code',
        'name',
        'description',
        'amount',
        'currency_code',
        'sort_order',
    ];

    /**
     * @return BelongsTo<PricingQuote, PricingQuoteItem>
     */
    public function quote(): BelongsTo
    {
        return $this->belongsTo(PricingQuote::class, 'pricing_quote_id');
    }
}

