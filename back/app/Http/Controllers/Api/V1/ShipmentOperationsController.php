<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentOperation;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

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

        return response()->json([
            'data' => $operation,
        ]);
    }

    public function update(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'transport_contractor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'customs_broker_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'insurance_company_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'overseas_agent_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'cut_off_date' => ['nullable', 'date'],
            'etd' => ['nullable', 'date'],
            'eta' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'operations_status' => ['nullable', 'integer', 'exists:shipment_statuses,id'],
            'is_reefer' => ['nullable', 'boolean'],
            'reefer_temp' => ['nullable', 'string', 'max:50'],
            'reefer_vent' => ['nullable', 'string', 'max:50'],
            'reefer_hum' => ['nullable', 'string', 'max:50'],
        ]);

        $operation = $shipment->operation ?: new ShipmentOperation(['shipment_id' => $shipment->id]);
        $before = $operation->exists ? $operation->getOriginal() : null;

        $operation->fill($validated);
        $operation->shipment_id = $shipment->id;
        $operation->save();

        if (array_key_exists('operations_status', $validated)) {
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

        if (array_key_exists('etd', $validated) || array_key_exists('eta', $validated) || array_key_exists('cut_off_date', $validated)) {
            ActivityLogger::log('shipment.schedule_updated', $shipment, [
                'before' => $before,
                'after' => $operation->getChanges(),
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

        return response()->json([
            'data' => $operation->fresh([
                'transportContractor',
                'customsBroker',
                'insuranceCompany',
                'overseasAgent',
            ]),
        ]);
    }
}

