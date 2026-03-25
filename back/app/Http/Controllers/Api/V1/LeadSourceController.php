<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\LeadSource;
use Illuminate\Http\JsonResponse;

class LeadSourceController extends Controller
{
    public function index(): JsonResponse
    {
        $items = LeadSource::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = LeadSource::create($request->validated());
        return response()->json(['data' => $item], 201);
    }

    public function show(LeadSource $leadSource): JsonResponse
    {
        return response()->json(['data' => $leadSource]);
    }

    public function update(UpdateLookupRequest $request, LeadSource $leadSource): JsonResponse
    {
        $leadSource->update($request->validated());
        return response()->json(['data' => $leadSource->fresh()]);
    }

    public function destroy(LeadSource $leadSource): JsonResponse
    {
        $leadSource->delete();
        return response()->json(['message' => __('Lead source deleted.')]);
    }
}
