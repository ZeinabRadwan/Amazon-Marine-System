<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Shipment extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'bl_number',
        'booking_number',
        'booking_date',
        'acid_number',
        'sd_form_id',
        'client_id',
        'sales_rep_id',
        'line_vendor_id',
        'origin_port_id',
        'destination_port_id',
        'route_text',
        'shipment_direction',
        'mode',
        'shipment_type',
        'status',
        'operations_status',
        'container_count',
        'container_size',
        'container_type',
        'loading_place',
        'loading_date',
        'cargo_description',
        'notes',
        'is_reefer',
        'reefer_temp',
        'reefer_vent',
        'reefer_hum',
        'cost_total',
        'selling_price_total',
        'profit_total',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'loading_date' => 'date',
        'booking_date' => 'date',
        'is_reefer' => 'bool',
        'container_count' => 'int',
        'operations_status' => 'int',
        'cost_total' => 'decimal:2',
        'selling_price_total' => 'decimal:2',
        'profit_total' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<Client, Shipment>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<User, Shipment>
     */
    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }

    /**
     * @return BelongsTo<Vendor, Shipment>
     */
    public function lineVendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'line_vendor_id');
    }

    /**
     * @return BelongsTo<Port, Shipment>
     */
    public function originPort(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'origin_port_id');
    }

    /**
     * @return BelongsTo<Port, Shipment>
     */
    public function destinationPort(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'destination_port_id');
    }

    /**
     * @return BelongsTo<SDForm, Shipment>
     */
    public function sdForm(): BelongsTo
    {
        return $this->belongsTo(SDForm::class);
    }

    /**
     * @return HasOne<ShipmentOperation>
     */
    public function operation(): HasOne
    {
        return $this->hasOne(ShipmentOperation::class);
    }

    /**
     * @return HasMany<ShipmentOperationTask>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(ShipmentOperationTask::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<Invoice>
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * @return HasMany<VendorBill>
     */
    public function vendorBills(): HasMany
    {
        return $this->hasMany(VendorBill::class);
    }

    /**
     * @return HasMany<Expense>
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Timeline / threaded notes (Note model). Named separately from the `notes` column so JSON serialization
     * does not overwrite shipment free-text notes with this relation (array_merge in Model::toArray).
     *
     * @return MorphMany<Note>
     */
    public function timelineNotes(): MorphMany
    {
        return $this->morphMany(Note::class, 'noteable');
    }

    /**
     * @return HasMany<ShipmentTrackingUpdate>
     */
    public function trackingUpdates(): HasMany
    {
        return $this->hasMany(ShipmentTrackingUpdate::class)->orderByDesc('created_at');
    }

    /**
     * @return HasOne<ShipmentTrackingUpdate>
     */
    public function latestTrackingUpdate(): HasOne
    {
        return $this->hasOne(ShipmentTrackingUpdate::class)->latestOfMany();
    }
}
