<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'contact_name',
        'company_name',
        'code',
        'type',
        'company_type',
        'business_activity',
        'target_markets',
        'tax_id',
        'email',
        'phone',
        'preferred_comm_method',
        'city',
        'country',
        'address',
        'website_url',
        'facebook_url',
        'linkedin_url',
        'status',
        'lead_source',
        'lead_source_other',
        'interest_level',
        'decision_maker_name',
        'decision_maker_title',
        'decision_maker_title_other',
        'default_payment_terms',
        'default_currency',
        'assigned_sales_id',
        'notes',
        'shipping_problems',
        'current_need',
        'pain_points',
        'opportunity',
        'special_requirements',
        'shipments_count',
        'total_profit',
        'last_contact_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'shipments_count' => 'int',
        'total_profit' => 'decimal:2',
        'last_contact_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, Client>
     */
    public function assignedSales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_sales_id');
    }

    /**
     * @return HasMany<ClientContact>
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(ClientContact::class);
    }

    /**
     * @return HasMany<Visit>
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    /**
     * @return HasMany<SDForm>
     */
    public function sdForms(): HasMany
    {
        return $this->hasMany(SDForm::class);
    }

    /**
     * @return HasMany<Shipment>
     */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    /**
     * @return HasMany<Invoice>
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * @return HasMany<Ticket>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * @return HasMany<Payment>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
