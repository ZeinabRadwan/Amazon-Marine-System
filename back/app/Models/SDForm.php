<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SDForm extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sd_number',
        'client_id',
        'sales_rep_id',
        'status',
        'pol_id',
        'pod_id',
        'shipping_line',
        'pol_text',
        'pod_text',
        'final_destination',
        'shipment_direction',
        'shipper_info',
        'consignee_info',
        'notify_party_mode',
        'notify_party_details',
        'freight_term',
        'container_type',
        'container_size',
        'num_containers',
        'requested_vessel_date',
        'acid_number',
        'cargo_description',
        'hs_code',
        'reefer_temp',
        'reefer_vent',
        'reefer_hum',
        'total_gross_weight',
        'total_net_weight',
        'linked_shipment_id',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'requested_vessel_date' => 'date',
        'total_gross_weight' => 'decimal:2',
        'total_net_weight' => 'decimal:2',
        'num_containers' => 'int',
    ];

    /**
     * @return BelongsTo<Client, SDForm>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<User, SDForm>
     */
    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }

    /**
     * @return BelongsTo<Port, SDForm>
     */
    public function pol(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'pol_id');
    }

    /**
     * @return BelongsTo<Port, SDForm>
     */
    public function pod(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'pod_id');
    }

    /**
     * @return BelongsTo<Shipment, SDForm>
     */
    public function linkedShipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class, 'linked_shipment_id');
    }
}
