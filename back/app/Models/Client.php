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
        'company_name',
        'company_type_id',
        'business_activity',
        'target_markets',
        'tax_id',
        'email',
        'phone',
        'preferred_comm_method_id',
        'address',
        'website_url',
        'facebook_url',
        'linkedin_url',
        'status',
        'lead_source_id',
        'lead_source_other',
        'interest_level_id',
        'decision_maker_name',
        'decision_maker_title_id',
        'decision_maker_title_other',
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
        'pricing_tier',
        'pricing_discount_pct',
        'pricing_updated_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'shipments_count' => 'int',
        'total_profit' => 'decimal:2',
        'last_contact_at' => 'datetime',
        'pricing_discount_pct' => 'decimal:2',
        'pricing_updated_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, Client>
     */
    public function assignedSales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_sales_id');
    }

    /**
     * @return BelongsTo<CompanyType, Client>
     */
    public function companyType(): BelongsTo
    {
        return $this->belongsTo(CompanyType::class, 'company_type_id');
    }

    /**
     * @return BelongsTo<PreferredCommMethod, Client>
     */
    public function preferredCommMethod(): BelongsTo
    {
        return $this->belongsTo(PreferredCommMethod::class, 'preferred_comm_method_id');
    }

    /**
     * @return BelongsTo<InterestLevel, Client>
     */
    public function interestLevel(): BelongsTo
    {
        return $this->belongsTo(InterestLevel::class, 'interest_level_id');
    }

    /**
     * @return BelongsTo<DecisionMakerTitle, Client>
     */
    public function decisionMakerTitle(): BelongsTo
    {
        return $this->belongsTo(DecisionMakerTitle::class, 'decision_maker_title_id');
    }

    /**
     * @return BelongsTo<LeadSource, Client>
     */
    public function leadSource(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class, 'lead_source_id');
    }

    /**
     * @return HasMany<ClientContact>
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(ClientContact::class);
    }

    /**
     * @return HasMany<ClientAttachment>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(ClientAttachment::class);
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
