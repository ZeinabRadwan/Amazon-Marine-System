<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Traits\HasFiles;

class PricingQuote extends Model
{
    use HasFactory, HasFiles;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'quote_no',
        'client_id',
        'sales_user_id',
        'pricing_offer_id',
        'pol',
        'pod',
        'shipping_line',
        'container_type',
        'qty',
        'transit_time',
        'free_time',
        'valid_from',
        'valid_to',
        'notes',
        'status',
        'available_sailing_days',
        'weekly_sailings',
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
     * @return BelongsTo<Client, PricingQuote>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<User, PricingQuote>
     */
    public function salesUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }

    /**
     * @return BelongsTo<PricingOffer, PricingQuote>
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(PricingOffer::class, 'pricing_offer_id');
    }

    /**
     * @return HasMany
     */
    public function items(): HasMany
    {
        return $this->hasMany(PricingQuoteItem::class);
    }

    /**
     * @return HasMany
     */
    public function sailingDates(): HasMany
    {
        return $this->hasMany(PricingQuoteSailingDate::class);
    }
}

