<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ShipmentOperationalPhase;
use App\Enums\ShipmentServiceType;
use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentOperation;
use App\Models\Vendor;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

class ShipmentOperationsController extends Controller
{
    public function show(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

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

        $validated = $request->validate([
            'service_types' => ['required', 'array', 'min:1'],
            'service_types.*' => ['required', 'string', Rule::in(ShipmentServiceType::values())],
            'transport_contractor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'customs_broker_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'insurance_company_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'overseas_agent_id' => ['nullable', 'integer', 'exists:vendors,id'],
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
        ]);

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
        $this->assertOtherPartyVendor($validated['overseas_agent_id'] ?? null);

        $operation = $shipment->operation ?: new ShipmentOperation(['shipment_id' => $shipment->id]);

        $scheduleBefore = $operation->exists
            ? Arr::only($operation->getOriginal(), ['cut_off_date', 'etd', 'eta', 'ops_loading_date'])
            : [];

        $operationFill = Arr::only($validated, [
            'transport_contractor_id',
            'customs_broker_id',
            'insurance_company_id',
            'overseas_agent_id',
            'cut_off_date',
            'etd',
            'eta',
            'ops_loading_date',
            'notes',
            'service_types',
            'transport_instructions',
        ]);

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
            $shipment->operations_status = null;
            $shipment->save();

            if ($shipment->operational_status_code !== $originalCode) {
                ActivityLogger::log('shipment.operational_phase_changed', $shipment, [
                    'from' => $originalCode,
                    'to' => $shipment->operational_status_code,
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
                ]);
            }
        }

        if ($operation->wasChanged(['cut_off_date', 'etd', 'eta', 'ops_loading_date'])) {
            ActivityLogger::log('shipment.schedule_updated', $shipment, [
                'before' => $scheduleBefore,
                'after' => Arr::only($operation->getChanges(), ['cut_off_date', 'etd', 'eta', 'ops_loading_date']),
            ]);
        }

        if ($operation->wasChanged([
            'service_types',
            'transport_instructions',
            'transport_contractor_id',
            'customs_broker_id',
            'insurance_company_id',
            'overseas_agent_id',
        ])) {
            ActivityLogger::log('shipment.operations_profile_updated', $shipment, [
                'changes' => $operation->getChanges(),
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

    private function assertVendorType(?int $vendorId, string $expectedType): void
    {
        if ($vendorId === null || $vendorId === 0) {
            return;
        }

        $ok = Vendor::query()->whereKey($vendorId)->where('type', $expectedType)->exists();
        if (! $ok) {
            abort(422, __('Invalid vendor selection for this role.'));
        }
    }

    private function assertOtherPartyVendor(?int $vendorId): void
    {
        if ($vendorId === null || $vendorId === 0) {
            return;
        }

        $ok = Vendor::query()->whereKey($vendorId)->whereIn('type', ['other', 'overseas_agent'])->exists();
        if (! $ok) {
            abort(422, __('Invalid other party vendor selection.'));
        }
    }
}
