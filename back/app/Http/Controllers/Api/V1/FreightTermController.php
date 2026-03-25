<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\FreightTerm;
use Illuminate\Http\JsonResponse;

class FreightTermController extends Controller
{
    public function index(): JsonResponse
    {
        $items = FreightTerm::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = FreightTerm::create($request->validated());
        return response()->json(['data' => $item], 201);
    }

    public function show(FreightTerm $freightTerm): JsonResponse
    {
        return response()->json(['data' => $freightTerm]);
    }

    public function update(UpdateLookupRequest $request, FreightTerm $freightTerm): JsonResponse
    {
        $freightTerm->update($request->validated());
        return response()->json(['data' => $freightTerm->fresh()]);
    }

    public function destroy(FreightTerm $freightTerm): JsonResponse
    {
        $freightTerm->delete();
        return response()->json(['message' => __('Freight term deleted.')]);
    }
}

