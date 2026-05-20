<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PricingQuote extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'quote_no',
        'client_id',
        'sales_user_id',
        'pricing_offer_id',
        'pricing_type',
        'origin_rate_snapshot_id',
        'quick_mode',
        'quick_mode_reason',
        'pol',
        'pod',
        'inland_port',
        'inland_address',
        'shipping_line',
        'show_carrier_on_pdf',
        'container_type',
        'container_spec',
        'qty',
        'transit_time',
        'free_time',
        'free_time_data',
        'schedule_type',
        'sailing_weekdays',
        'valid_from',
        'valid_to',
        'notes',
        'municipality',
        'official_receipts_note',
        'pricing_team_confirmed',
        'status',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
        'quick_mode' => 'boolean',
        'pricing_team_confirmed' => 'boolean',
        'show_carrier_on_pdf' => 'boolean',
        'container_spec' => 'array',
        'free_time_data' => 'array',
        'sailing_weekdays' => 'array',
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
     * Quotations owned by a salesperson (creator or assigned client).
     *
     * @param  Builder<PricingQuote>  $query
     */
    public function scopeForSalesperson(Builder $query, int $userId): void
    {
        $query->where(function (Builder $q) use ($userId) {
            $q->where('sales_user_id', $userId)
                ->orWhereHas('client', fn (Builder $c) => $c->where('assigned_sales_id', $userId));
        });
    }

    /**
     * @return BelongsTo<PricingOffer, PricingQuote>
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(PricingOffer::class, 'pricing_offer_id');
    }

    /**
     * @return BelongsTo<PricingOfferSnapshot, PricingQuote>
     */
    public function originRateSnapshot(): BelongsTo
    {
        return $this->belongsTo(PricingOfferSnapshot::class, 'origin_rate_snapshot_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PricingQuoteItem::class);
    }

    public function sailingDates(): HasMany
    {
        return $this->hasMany(PricingQuoteSailingDate::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class, 'pricing_quote_id');
    }
}
