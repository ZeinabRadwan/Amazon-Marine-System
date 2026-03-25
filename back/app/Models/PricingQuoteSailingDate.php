<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PricingQuoteSailingDate extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'pricing_quote_id',
        'sailing_date',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'sailing_date' => 'date',
    ];

    /**
     * @return BelongsTo<PricingQuote, PricingQuoteSailingDate>
     */
    public function quote(): BelongsTo
    {
        return $this->belongsTo(PricingQuote::class, 'pricing_quote_id');
    }
}

