<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ShipmentStatus\StoreShipmentStatusRequest;
use App\Http\Requests\ShipmentStatus\UpdateShipmentStatusRequest;
use App\Models\ShipmentStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShipmentStatusController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $statuses = ShipmentStatus::query()
            ->orderByDesc('active')
            ->orderBy('sort_order')
            ->orderBy('name_ar')
            ->get();

        return response()->json([
            'data' => $statuses->map(fn (ShipmentStatus $s) => [
                'id' => $s->id,
                'name_ar' => $s->name_ar,
                'name_en' => $s->name_en,
                'color' => $s->color,
                'description' => $s->description,
                'active' => (bool) $s->active,
                'sort_order' => (int) $s->sort_order,
            ]),
        ]);
    }

    public function store(StoreShipmentStatusRequest $request): JsonResponse
    {
        $status = ShipmentStatus::query()->create($request->validated());

        return response()->json([
            'data' => [
                'id' => $status->id,
                'name_ar' => $status->name_ar,
                'name_en' => $status->name_en,
                'color' => $status->color,
                'description' => $status->description,
                'active' => (bool) $status->active,
                'sort_order' => (int) $status->sort_order,
            ],
        ], 201);
    }

    public function update(UpdateShipmentStatusRequest $request, ShipmentStatus $shipmentStatus): JsonResponse
    {
        $shipmentStatus->fill($request->validated());
        $shipmentStatus->save();

        return response()->json([
            'data' => [
                'id' => $shipmentStatus->id,
                'name_ar' => $shipmentStatus->name_ar,
                'name_en' => $shipmentStatus->name_en,
                'color' => $shipmentStatus->color,
                'description' => $shipmentStatus->description,
                'active' => (bool) $shipmentStatus->active,
                'sort_order' => (int) $shipmentStatus->sort_order,
            ],
        ]);
    }

    public function destroy(Request $request, ShipmentStatus $shipmentStatus): JsonResponse
    {
        if (! $request->user()?->can('shipments.manage_ops') && ! $request->user()?->can('reports.view') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        $shipmentStatus->delete();

        return response()->json([
            'message' => 'Shipment status deleted.',
        ]);
    }
}
