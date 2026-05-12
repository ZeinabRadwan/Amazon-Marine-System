<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentOperation extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'shipment_id',
        'service_types',
        'transport_contractor_id',
        'customs_broker_id',
        'insurance_company_id',
        'overseas_agent_id',
        'cut_off_date',
        'etd',
        'eta',
        'ops_loading_date',
        'notes',
        'transport_instructions',
        'transport_instruction_profile',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'service_types' => 'array',
        'cut_off_date' => 'date',
        'etd' => 'datetime',
        'eta' => 'datetime',
        'ops_loading_date' => 'date',
        'transport_instruction_profile' => 'array',
    ];

    /**
     * @return BelongsTo<Shipment, ShipmentOperation>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return BelongsTo<Vendor, ShipmentOperation>
     */
    public function transportContractor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'transport_contractor_id');
    }

    /**
     * @return BelongsTo<Vendor, ShipmentOperation>
     */
    public function customsBroker(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'customs_broker_id');
    }

    /**
     * @return BelongsTo<Vendor, ShipmentOperation>
     */
    public function insuranceCompany(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'insurance_company_id');
    }

    /**
     * @return BelongsTo<Vendor, ShipmentOperation>
     */
    public function overseasAgent(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'overseas_agent_id');
    }

    /**
     * Validation rules for {@see $transport_instruction_profile} (merge into request validation).
     *
     * @return array<string, mixed>
     */
    public static function transportInstructionProfileValidationRules(): array
    {
        return [
            'transport_instruction_profile' => ['nullable', 'array'],
            'transport_instruction_profile.customer_arrival_at' => ['nullable', 'date'],
            'transport_instruction_profile.loading_place_name' => ['nullable', 'string', 'max:255'],
            'transport_instruction_profile.loading_address' => ['nullable', 'string', 'max:2000'],
            'transport_instruction_profile.loading_maps_url' => ['nullable', 'string', 'max:2000'],
            'transport_instruction_profile.loading_contact_name' => ['nullable', 'string', 'max:255'],
            'transport_instruction_profile.loading_contact_phone' => ['nullable', 'string', 'max:80'],
            'transport_instruction_profile.customs_document_type' => ['nullable', 'string', 'in:certificate,bill_of_lading,manifest'],
            'transport_instruction_profile.generator' => ['nullable', 'string', 'in:yes,no'],
            'transport_instruction_profile.generator_temperature' => ['nullable', 'string', 'max:120'],
            'transport_instruction_profile.generator_driver_instructions' => ['nullable', 'string', 'max:5000'],
            'transport_instruction_profile.approved_customs_broker_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'transport_instruction_profile.customs_notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $data
     * @return array<string, mixed>|null
     */
    public static function normalizeTransportInstructionProfile(?array $data): ?array
    {
        if ($data === null) {
            return null;
        }

        $brokerRaw = $data['approved_customs_broker_id'] ?? null;
        $brokerId = $brokerRaw === '' || $brokerRaw === null ? null : (int) $brokerRaw;

        $gen = strtolower((string) ($data['generator'] ?? 'no'));
        $gen = $gen === 'yes' ? 'yes' : 'no';

        $doc = strtolower((string) ($data['customs_document_type'] ?? ''));
        $doc = in_array($doc, ['certificate', 'bill_of_lading', 'manifest'], true) ? $doc : null;

        $out = [
            'customer_arrival_at' => self::trimNullableString($data['customer_arrival_at'] ?? null),
            'loading_place_name' => self::trimNullableString($data['loading_place_name'] ?? null),
            'loading_address' => self::trimNullableString($data['loading_address'] ?? null),
            'loading_maps_url' => self::trimNullableString($data['loading_maps_url'] ?? null),
            'loading_contact_name' => self::trimNullableString($data['loading_contact_name'] ?? null),
            'loading_contact_phone' => self::trimNullableString($data['loading_contact_phone'] ?? null),
            'customs_document_type' => $doc,
            'generator' => $gen,
            'generator_temperature' => $gen === 'yes' ? self::trimNullableString($data['generator_temperature'] ?? null) : null,
            'generator_driver_instructions' => $gen === 'yes' ? self::trimNullableString($data['generator_driver_instructions'] ?? null) : null,
            'approved_customs_broker_id' => $brokerId && $brokerId > 0 ? $brokerId : null,
            'customs_notes' => self::trimNullableString($data['customs_notes'] ?? null),
        ];

        $empty = $out['customer_arrival_at'] === null
            && $out['loading_place_name'] === null
            && $out['loading_address'] === null
            && $out['loading_maps_url'] === null
            && $out['loading_contact_name'] === null
            && $out['loading_contact_phone'] === null
            && $out['customs_document_type'] === null
            && $out['generator'] === 'no'
            && $out['approved_customs_broker_id'] === null
            && $out['customs_notes'] === null;

        return $empty ? null : $out;
    }

    private static function trimNullableString(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = trim((string) $v);

        return $s === '' ? null : $s;
    }
}
