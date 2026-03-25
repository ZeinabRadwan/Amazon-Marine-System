<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\ClientStatus;
use Illuminate\Http\JsonResponse;

class ClientStatusController extends Controller
{
    public function index(): JsonResponse
    {
        $items = ClientStatus::orderBy('sort_order')->orderBy('name')->get();

        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = ClientStatus::create($request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function show(ClientStatus $clientStatus): JsonResponse
    {
        return response()->json(['data' => $clientStatus]);
    }

    public function update(UpdateLookupRequest $request, ClientStatus $clientStatus): JsonResponse
    {
        $clientStatus->update($request->validated());

        return response()->json(['data' => $clientStatus->fresh()]);
    }

    public function destroy(ClientStatus $clientStatus): JsonResponse
    {
        $clientStatus->delete();

        return response()->json(['message' => __('Client status deleted.')]);
    }
}
