<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ShipmentOperationalPhase;
use App\Enums\ShipmentServiceType;
use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentOperation;
use App\Models\Vendor;
use App\Services\ActivityLogger;
use App\Support\VendorTypeAliases;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class ShipmentOperationsController extends Controller
{
    public function show(Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $operation = $shipment->operation()->with([
            'transportContractor',
            'customsBroker',
            'insuranceCompany',
            'overseasAgent',
        ])->first();

        $data = $operation ? $operation->toArray() : [];
        $data['operations_status'] = $shipment->operations_status;
        $data['operational_status_code'] = $shipment->operational_status_code;

        return response()->json([
            'data' => $data,
        ]);
    }

    public function update(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate(array_merge([
            'service_types' => ['required', 'array', 'min:1'],
            'service_types.*' => ['required', 'string', Rule::in(ShipmentServiceType::values())],
            'transport_contractor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'customs_broker_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'insurance_company_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'other_party_name' => ['nullable', 'string', 'max:255'],
            'other_party_role' => ['nullable', 'string', 'max:2000'],
            'cut_off_date' => ['nullable', 'date'],
            'etd' => ['nullable', 'date'],
            'eta' => ['nullable', 'date'],
            'ops_loading_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'transport_instructions' => ['nullable', 'string'],
            'operational_status_code' => ['nullable', 'string', Rule::in(ShipmentOperationalPhase::values())],
            'operations_status' => ['nullable', 'integer', 'exists:shipment_statuses,id'],
            'is_reefer' => ['nullable', 'boolean'],
            'reefer_temp' => ['nullable', 'string', 'max:50'],
            'reefer_vent' => ['nullable', 'string', 'max:50'],
            'reefer_hum' => ['nullable', 'string', 'max:50'],
        ], ShipmentOperation::transportInstructionProfileValidationRules()));

        $types = $validated['service_types'];

        if (in_array(ShipmentServiceType::InlandTransport->value, $types, true)) {
            if (empty($validated['transport_contractor_id'])) {
                abort(422, __('Inland transport contractor is required when inland transport is selected.'));
            }
        }

        if (in_array(ShipmentServiceType::CustomsClearance->value, $types, true)) {
            if (empty($validated['customs_broker_id'])) {
                abort(422, __('Customs broker is required when customs clearance is selected.'));
            }
        }

        $this->assertVendorType($validated['transport_contractor_id'] ?? null, 'inland_transport');
        $this->assertVendorType($validated['customs_broker_id'] ?? null, 'customs_clearance');
        $this->assertVendorType($validated['insurance_company_id'] ?? null, 'insurance');

        $tiBrokerId = null;
        if ($request->has('transport_instruction_profile')) {
            $rawTi = $request->input('transport_instruction_profile');
            $normTi = ShipmentOperation::normalizeTransportInstructionProfile(is_array($rawTi) ? $rawTi : null);
            $tiBrokerId = $normTi['approved_customs_broker_id'] ?? null;
            $this->assertVendorType($tiBrokerId, 'customs_clearance');
        }

        $operation = $shipment->operation ?: new ShipmentOperation(['shipment_id' => $shipment->id]);

        $scheduleKeys = ['cut_off_date', 'etd', 'eta', 'ops_loading_date'];
        $scheduleBefore = $operation->exists ? Arr::only($operation->getAttributes(), $scheduleKeys) : [];

        $profileKeys = [
            'service_types',
            'transport_contractor_id',
            'customs_broker_id',
            'insurance_company_id',
            'overseas_agent_id',
            'other_party_name',
            'other_party_role',
            'transport_instructions',
            'transport_instruction_profile',
        ];
        $profileBefore = $operation->exists
            ? Arr::only($operation->getAttributes(), $profileKeys)
            : array_fill_keys($profileKeys, null);

        $operationFill = Arr::only($validated, [
            'transport_contractor_id',
            'customs_broker_id',
            'insurance_company_id',
            'cut_off_date',
            'etd',
            'eta',
            'ops_loading_date',
            'notes',
            'service_types',
            'transport_instructions',
            'other_party_name',
            'other_party_role',
        ]);
        $operationFill['overseas_agent_id'] = null;

        if ($request->has('transport_instruction_profile')) {
            $rawTi = $request->input('transport_instruction_profile');
            $operationFill['transport_instruction_profile'] = ShipmentOperation::normalizeTransportInstructionProfile(is_array($rawTi) ? $rawTi : null);
        }

        if (! in_array(ShipmentServiceType::InlandTransport->value, $types, true)) {
            $operationFill['transport_contractor_id'] = null;
        }

        if (! in_array(ShipmentServiceType::CustomsClearance->value, $types, true)) {
            $operationFill['customs_broker_id'] = null;
        }

        $operation->fill($operationFill);
        $operation->shipment_id = $shipment->id;
        $operation->save();

        if (array_key_exists('operational_status_code', $validated)) {
            $originalCode = $shipment->operational_status_code;
            $shipment->operational_status_code = $validated['operational_status_code'] ?: null;
            $shipment->save();

            if ($shipment->operational_status_code !== $originalCode) {
                ActivityLogger::log('shipment.operational_phase_changed', $shipment, [
                    'from' => $originalCode,
                    'to' => $shipment->operational_status_code,
                    'old_value' => (string) ($originalCode ?? ''),
                    'new_value' => (string) ($shipment->operational_status_code ?? ''),
                ]);
            }
        } elseif (array_key_exists('operations_status', $validated)) {
            $originalOpsStatus = $shipment->operations_status;
            $shipment->operations_status = $validated['operations_status'];
            $shipment->save();

            if ($shipment->operations_status !== $originalOpsStatus) {
                ActivityLogger::log('shipment.operations_status_changed', $shipment, [
                    'from' => $originalOpsStatus,
                    'to' => $shipment->operations_status,
                    'old_value' => (string) ($originalOpsStatus ?? ''),
                    'new_value' => (string) ($shipment->operations_status ?? ''),
                ]);
            }
        }

        $scheduleAfter = Arr::only($operation->getAttributes(), $scheduleKeys);
        if ($this->encodeSnapshot($scheduleBefore) !== $this->encodeSnapshot($scheduleAfter)) {
            ActivityLogger::log('shipment.schedule_updated', $shipment, [
                'before' => $scheduleBefore,
                'after' => $scheduleAfter,
                'old_value' => $this->summarizeScheduleRow($scheduleBefore),
                'new_value' => $this->summarizeScheduleRow($scheduleAfter),
            ]);
        }

        $profileAfter = Arr::only($operation->getAttributes(), $profileKeys);
        if ($this->operationProfileChanged($profileBefore, $profileAfter)) {
            $vendorIds = [];
            foreach ([$profileBefore, $profileAfter] as $slice) {
                foreach (['transport_contractor_id', 'customs_broker_id', 'insurance_company_id', 'overseas_agent_id'] as $col) {
                    if (! empty($slice[$col])) {
                        $vendorIds[] = (int) $slice[$col];
                    }
                }
            }
            $vendorIds = array_values(array_unique($vendorIds));
            $vendorNames = $vendorIds === []
                ? collect()
                : Vendor::query()->whereIn('id', $vendorIds)->pluck('name', 'id');

            ActivityLogger::log('shipment.operations_profile_updated', $shipment, [
                'before' => $profileBefore,
                'after' => $profileAfter,
                'old_value' => $this->summarizeOperationProfile($profileBefore, $vendorNames),
                'new_value' => $this->summarizeOperationProfile($profileAfter, $vendorNames),
            ]);
        }

        if (array_key_exists('is_reefer', $validated) || array_key_exists('reefer_temp', $validated)) {
            $shipment->is_reefer = $validated['is_reefer'] ?? $shipment->is_reefer;
            $shipment->reefer_temp = $validated['reefer_temp'] ?? $shipment->reefer_temp;
            $shipment->reefer_vent = $validated['reefer_vent'] ?? $shipment->reefer_vent;
            $shipment->reefer_hum = $validated['reefer_hum'] ?? $shipment->reefer_hum;
            $shipment->save();

            ActivityLogger::log('shipment.reefer_updated', $shipment, [
                'is_reefer' => $shipment->is_reefer,
                'reefer_temp' => $shipment->reefer_temp,
                'old_value' => '',
                'new_value' => json_encode([
                    'is_reefer' => $shipment->is_reefer,
                    'reefer_temp' => $shipment->reefer_temp,
                    'reefer_vent' => $shipment->reefer_vent,
                    'reefer_hum' => $shipment->reefer_hum,
                ]),
            ]);
        }

        $data = $operation->load([
            'transportContractor',
            'customsBroker',
            'insuranceCompany',
            'overseasAgent',
        ])->toArray();
        $data['operations_status'] = $shipment->operations_status;
        $data['operational_status_code'] = $shipment->operational_status_code;

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function encodeSnapshot(array $row): string
    {
        $norm = [];
        foreach ($row as $k => $v) {
            $norm[$k] = $this->normalizeScalarForJson($v);
        }

        return json_encode($norm);
    }

    private function normalizeScalarForJson(mixed $v): mixed
    {
        if ($v instanceof CarbonInterface) {
            return $v->toIso8601String();
        }

        return $v;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function summarizeScheduleRow(array $row): string
    {
        $parts = [];
        foreach (['cut_off_date' => 'CO', 'etd' => 'ETD', 'eta' => 'ETA', 'ops_loading_date' => 'Loading'] as $key => $label) {
            if (! array_key_exists($key, $row)) {
                continue;
            }
            $parts[] = $label.': '.$this->formatForAuditLine($row[$key] ?? null);
        }

        return $parts === [] ? '—' : implode(' | ', $parts);
    }

    private function formatForAuditLine(mixed $v): string
    {
        if ($v === null || $v === '') {
            return '—';
        }
        if ($v instanceof CarbonInterface) {
            return $v->toDateString().($v->format('H:i:s') !== '00:00:00' ? ' '.$v->format('H:i') : '');
        }

        return (string) $v;
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  Collection<int, string>  $vendorNames  id => name
     */
    private function summarizeOperationProfile(array $row, $vendorNames): string
    {
        $lines = [];
        $st = $row['service_types'] ?? [];
        if (is_array($st) && $st !== []) {
            $lines[] = 'services: '.implode(', ', $st);
        }

        $map = [
            'transport_contractor_id' => 'inland_contractor',
            'customs_broker_id' => 'customs_broker',
            'insurance_company_id' => 'insurance',
            'overseas_agent_id' => 'overseas_agent',
        ];
        foreach ($map as $col => $label) {
            if (! array_key_exists($col, $row)) {
                continue;
            }
            $id = $row[$col];
            $name = $id ? (string) ($vendorNames[$id] ?? '#'.$id) : '—';
            $lines[] = $label.': '.$name;
        }

        if (array_key_exists('other_party_name', $row) || array_key_exists('other_party_role', $row)) {
            $on = trim((string) ($row['other_party_name'] ?? ''));
            $or = trim((string) ($row['other_party_role'] ?? ''));
            if ($on !== '' || $or !== '') {
                $lines[] = 'other_party: '.$on.($or !== '' ? ' / '.$or : '');
            }
        }

        $ti = $row['transport_instructions'] ?? null;
        if (array_key_exists('transport_instructions', $row)) {
            $tiStr = is_string($ti) ? trim($ti) : (string) json_encode($ti);
            if (strlen($tiStr) > 160) {
                $tiStr = substr($tiStr, 0, 157).'…';
            }
            $lines[] = 'instructions: '.($tiStr !== '' ? $tiStr : '—');
        }

        if (array_key_exists('transport_instruction_profile', $row)) {
            $tip = $row['transport_instruction_profile'];
            $hasTip = (is_array($tip) && $tip !== [])
                || (is_string($tip) && $tip !== '' && $tip !== '[]' && $tip !== 'null');
            $lines[] = 'transport_instruction_profile: '.($hasTip ? '[form updated]' : '—');
        }

        return $lines === [] ? '—' : implode("\n", $lines);
    }

    /**
     * @param  array<string, mixed>  $a
     * @param  array<string, mixed>  $b
     */
    private function operationProfileChanged(array $a, array $b): bool
    {
        return $this->encodeSnapshot($this->normalizeProfile($a)) !== $this->encodeSnapshot($this->normalizeProfile($b));
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeProfile(array $row): array
    {
        $out = $row;
        if (isset($out['service_types']) && is_array($out['service_types'])) {
            $st = $out['service_types'];
            sort($st);
            $out['service_types'] = $st;
        }
        foreach (['transport_contractor_id', 'customs_broker_id', 'insurance_company_id', 'overseas_agent_id'] as $k) {
            $out[$k] = isset($out[$k]) && $out[$k] !== null && $out[$k] !== '' ? (int) $out[$k] : null;
        }
        $ti = $out['transport_instructions'] ?? '';
        $out['transport_instructions'] = is_string($ti) ? trim($ti) : $ti;

        $on = isset($out['other_party_name']) ? trim((string) $out['other_party_name']) : '';
        $out['other_party_name'] = $on === '' ? null : $on;
        $orr = isset($out['other_party_role']) ? trim((string) $out['other_party_role']) : '';
        $out['other_party_role'] = $orr === '' ? null : $orr;

        $tip = $out['transport_instruction_profile'] ?? null;
        if (is_string($tip)) {
            $decoded = json_decode($tip, true);
            $tip = is_array($decoded) ? $decoded : [];
        } elseif (! is_array($tip)) {
            $tip = [];
        }
        ksort($tip);
        $out['transport_instruction_profile'] = $tip === [] ? null : json_encode($tip, JSON_UNESCAPED_UNICODE);

        return $out;
    }

    private function assertVendorType(?int $vendorId, string $expectedType): void
    {
        if ($vendorId === null || $vendorId === 0) {
            return;
        }

        $vendor = Vendor::query()->find($vendorId);
        if ($vendor === null) {
            abort(422, __('Invalid vendor selection for this role.'));
        }

        if (! VendorTypeAliases::vendorMatchesCanonical($vendor->type, $expectedType)) {
            abort(422, __('Invalid vendor selection for this role.'));
        }
    }
}
