<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommunicationLogTypeRequest;
use App\Http\Requests\UpdateCommunicationLogTypeRequest;
use App\Models\CommunicationLogType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunicationLogTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('customer_service.view_comms') && ! $request->user()?->can('customer_service.manage_comms') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        $types = CommunicationLogType::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $types->map(fn (CommunicationLogType $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'label_ar' => $t->label_ar,
                'sort_order' => (int) $t->sort_order,
            ]),
        ]);
    }

    public function store(StoreCommunicationLogTypeRequest $request): JsonResponse
    {
        $type = CommunicationLogType::query()->create($request->validated());

        return response()->json([
            'data' => [
                'id' => $type->id,
                'name' => $type->name,
                'label_ar' => $type->label_ar,
                'sort_order' => (int) $type->sort_order,
            ],
        ], 201);
    }

    public function show(Request $request, CommunicationLogType $communicationLogType): JsonResponse
    {
        if (! $request->user()?->can('customer_service.view_comms') && ! $request->user()?->can('customer_service.manage_comms') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        return response()->json([
            'data' => [
                'id' => $communicationLogType->id,
                'name' => $communicationLogType->name,
                'label_ar' => $communicationLogType->label_ar,
                'sort_order' => (int) $communicationLogType->sort_order,
            ],
        ]);
    }

    public function update(UpdateCommunicationLogTypeRequest $request, CommunicationLogType $communicationLogType): JsonResponse
    {
        $communicationLogType->fill($request->validated());
        $communicationLogType->save();

        return response()->json([
            'data' => [
                'id' => $communicationLogType->id,
                'name' => $communicationLogType->name,
                'label_ar' => $communicationLogType->label_ar,
                'sort_order' => (int) $communicationLogType->sort_order,
            ],
        ]);
    }

    public function destroy(Request $request, CommunicationLogType $communicationLogType): JsonResponse
    {
        if (! $request->user()?->can('customer_service.manage_comms') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        $communicationLogType->delete();

        return response()->json([
            'message' => __('Communication log type deleted.'),
        ]);
    }
}
