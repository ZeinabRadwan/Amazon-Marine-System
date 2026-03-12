<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShipmentTrackingUpdateRequest;
use App\Models\Shipment;
use App\Models\ShipmentTrackingUpdate;
use Illuminate\Http\JsonResponse;

class ShipmentTrackingUpdateController extends Controller
{
    public function index(Shipment $shipment): JsonResponse
    {
        $this->authorize('viewAny', ShipmentTrackingUpdate::class);

        $updates = $shipment->trackingUpdates()->with('createdBy')->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $updates,
        ]);
    }

    public function store(StoreShipmentTrackingUpdateRequest $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validated();

        $update = new ShipmentTrackingUpdate;
        $update->shipment_id = $shipment->id;
        $update->update_text = $validated['update_text'];
        $update->created_by_id = $request->user()->id;
        $update->save();

        return response()->json([
            'data' => $update->load('createdBy'),
        ], 201);
    }
}
