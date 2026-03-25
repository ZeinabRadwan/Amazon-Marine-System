<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\ContainerSize;
use Illuminate\Http\JsonResponse;

class ContainerSizeController extends Controller
{
    public function index(): JsonResponse
    {
        $items = ContainerSize::orderBy('sort_order')->orderBy('name')->get();

        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = ContainerSize::create($request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function show(ContainerSize $containerSize): JsonResponse
    {
        return response()->json(['data' => $containerSize]);
    }

    public function update(UpdateLookupRequest $request, ContainerSize $containerSize): JsonResponse
    {
        $containerSize->update($request->validated());

        return response()->json(['data' => $containerSize->fresh()]);
    }

    public function destroy(ContainerSize $containerSize): JsonResponse
    {
        $containerSize->delete();

        return response()->json(['message' => __('Container size deleted.')]);
    }
}
