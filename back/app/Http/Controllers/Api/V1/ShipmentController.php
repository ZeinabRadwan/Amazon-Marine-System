<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\Vendor;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class ShipmentController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Shipment::class);

        $query = Shipment::query()
            ->with(['client', 'salesRep', 'lineVendor', 'originPort', 'destinationPort', 'sdForm']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($opsStatus = $request->query('operations_status')) {
            $query->where('operations_status', $opsStatus);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($salesRepId = $request->query('sales_rep_id')) {
            $query->where('sales_rep_id', $salesRepId);
        }

        if ($lineVendorId = $request->query('line_vendor_id')) {
            $query->where('line_vendor_id', $lineVendorId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($sd = $request->query('sd_number')) {
            $query->whereHas('sdForm', function ($q) use ($sd) {
                $q->where('sd_number', 'like', '%' . $sd . '%');
            });
        }

        if ($bl = $request->query('bl_number')) {
            $query->where('bl_number', 'like', '%' . $bl . '%');
        }

        $perPage = $request->integer('per_page', 15);
        $paginator = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Shipment::class);

        $validated = $request->validate([
            'sd_form_id' => ['nullable', 'integer', 'exists:sd_forms,id'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'sales_rep_id' => ['nullable', 'integer', 'exists:users,id'],
            'line_vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'origin_port_id' => ['nullable', 'integer', 'exists:ports,id'],
            'destination_port_id' => ['nullable', 'integer', 'exists:ports,id'],
            'shipment_direction' => ['nullable', 'string', 'in:Export,Import'],
            'mode' => ['nullable', 'string', 'in:Sea,Air,Land'],
            'shipment_type' => ['nullable', 'string', 'in:FCL,LCL'],
            'status' => ['nullable', 'string', 'max:40'],
            'operations_status' => ['nullable', 'integer', 'min:1', 'max:8'],
            'container_count' => ['nullable', 'integer', 'min:1'],
            'container_size' => ['nullable', 'string', 'max:10'],
            'container_type' => ['nullable', 'string', 'max:40'],
            'loading_place' => ['nullable', 'string', 'max:255'],
            'loading_date' => ['nullable', 'date'],
            'cargo_description' => ['nullable', 'string'],
            'is_reefer' => ['nullable', 'boolean'],
            'reefer_temp' => ['nullable', 'string', 'max:50'],
            'reefer_vent' => ['nullable', 'string', 'max:50'],
            'reefer_hum' => ['nullable', 'string', 'max:50'],
        ]);

        $shipment = new Shipment($validated);

        if (! $shipment->client_id && $shipment->sd_form_id) {
            $sd = SDForm::find($shipment->sd_form_id);
            if ($sd) {
                $shipment->client_id = $sd->client_id;
                $shipment->sales_rep_id = $sd->sales_rep_id;
                $shipment->shipment_direction = $sd->shipment_direction;
                $shipment->origin_port_id = $sd->pol_id;
                $shipment->destination_port_id = $sd->pod_id;
                $shipment->container_size = $sd->container_size;
                $shipment->container_type = $sd->container_type;
                $shipment->container_count = $sd->num_containers;
                $shipment->cargo_description = $sd->cargo_description;
            }
        }

        $shipment->status = $shipment->status ?? 'booked';
        $shipment->mode = $shipment->mode ?? 'Sea';
        $shipment->shipment_type = $shipment->shipment_type ?? 'FCL';

        $shipment->save();

        ActivityLogger::log('shipment.created', $shipment, [
            'client_id' => $shipment->client_id,
            'sd_form_id' => $shipment->sd_form_id,
        ]);

        return response()->json([
            'data' => $shipment->fresh(['client', 'salesRep', 'lineVendor', 'originPort', 'destinationPort', 'sdForm']),
        ], 201);
    }

    public function show(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        return response()->json([
            'data' => $shipment->load([
                'client',
                'salesRep',
                'lineVendor',
                'originPort',
                'destinationPort',
                'sdForm',
                'operation',
                'tasks',
            ]),
        ]);
    }

    public function update(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'bl_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'booking_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:40'],
            'operations_status' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:8'],
            'loading_place' => ['sometimes', 'nullable', 'string', 'max:255'],
            'loading_date' => ['sometimes', 'nullable', 'date'],
            'is_reefer' => ['sometimes', 'boolean'],
            'reefer_temp' => ['sometimes', 'nullable', 'string', 'max:50'],
            'reefer_vent' => ['sometimes', 'nullable', 'string', 'max:50'],
            'reefer_hum' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $originalStatus = $shipment->status;
        $originalOpsStatus = $shipment->operations_status;

        $shipment->fill($validated);
        $shipment->save();

        if ($shipment->status !== $originalStatus) {
            ActivityLogger::log('shipment.status_changed', $shipment, [
                'from' => $originalStatus,
                'to' => $shipment->status,
            ]);
        }

        if ($shipment->operations_status !== $originalOpsStatus) {
            ActivityLogger::log('shipment.operations_status_changed', $shipment, [
                'from' => $originalOpsStatus,
                'to' => $shipment->operations_status,
            ]);
        }

        return response()->json([
            'data' => $shipment->fresh(),
        ]);
    }
}

