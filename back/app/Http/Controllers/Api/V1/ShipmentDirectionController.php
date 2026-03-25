<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\ShipmentDirection;
use Illuminate\Http\JsonResponse;

class ShipmentDirectionController extends Controller
{
    public function index(): JsonResponse
    {
        $items = ShipmentDirection::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = ShipmentDirection::create($request->validated());
        return response()->json(['data' => $item], 201);
    }

    public function show(ShipmentDirection $shipmentDirection): JsonResponse
    {
        return response()->json(['data' => $shipmentDirection]);
    }

    public function update(UpdateLookupRequest $request, ShipmentDirection $shipmentDirection): JsonResponse
    {
        $shipmentDirection->update($request->validated());
        return response()->json(['data' => $shipmentDirection->fresh()]);
    }

    public function destroy(ShipmentDirection $shipmentDirection): JsonResponse
    {
        $shipmentDirection->delete();
        return response()->json(['message' => __('Shipment direction deleted.')]);
    }
}

