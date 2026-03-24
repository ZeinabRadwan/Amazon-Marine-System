<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\ContainerType;
use Illuminate\Http\JsonResponse;

class ContainerTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $items = ContainerType::orderBy('sort_order')->orderBy('name')->get();

        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = ContainerType::create($request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function show(ContainerType $containerType): JsonResponse
    {
        return response()->json(['data' => $containerType]);
    }

    public function update(UpdateLookupRequest $request, ContainerType $containerType): JsonResponse
    {
        $containerType->update($request->validated());

        return response()->json(['data' => $containerType->fresh()]);
    }

    public function destroy(ContainerType $containerType): JsonResponse
    {
        $containerType->delete();

        return response()->json(['message' => 'Container type deleted.']);
    }
}
