<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\NotifyPartyMode;
use Illuminate\Http\JsonResponse;

class NotifyPartyModeController extends Controller
{
    public function index(): JsonResponse
    {
        $items = NotifyPartyMode::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = NotifyPartyMode::create($request->validated());
        return response()->json(['data' => $item], 201);
    }

    public function show(NotifyPartyMode $notifyPartyMode): JsonResponse
    {
        return response()->json(['data' => $notifyPartyMode]);
    }

    public function update(UpdateLookupRequest $request, NotifyPartyMode $notifyPartyMode): JsonResponse
    {
        $notifyPartyMode->update($request->validated());
        return response()->json(['data' => $notifyPartyMode->fresh()]);
    }

    public function destroy(NotifyPartyMode $notifyPartyMode): JsonResponse
    {
        $notifyPartyMode->delete();
        return response()->json(['message' => __('Notify party mode deleted.')]);
    }
}

