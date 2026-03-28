<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientStatusRequest;
use App\Http\Requests\UpdateClientStatusRequest;
use App\Models\ClientStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientStatusController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ClientStatus::query()
            ->orderBy('applies_to')
            ->orderBy('sort_order')
            ->orderBy('name_en');

        $appliesTo = $request->query('applies_to');
        if (in_array($appliesTo, ['lead', 'client'], true)) {
            $query->where('applies_to', $appliesTo);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(StoreClientStatusRequest $request): JsonResponse
    {
        $item = ClientStatus::create($request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function show(ClientStatus $clientStatus): JsonResponse
    {
        return response()->json(['data' => $clientStatus]);
    }

    public function update(UpdateClientStatusRequest $request, ClientStatus $clientStatus): JsonResponse
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
