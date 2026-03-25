<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\DecisionMakerTitle;
use Illuminate\Http\JsonResponse;

class DecisionMakerTitleController extends Controller
{
    public function index(): JsonResponse
    {
        $items = DecisionMakerTitle::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = DecisionMakerTitle::create($request->validated());
        return response()->json(['data' => $item], 201);
    }

    public function show(DecisionMakerTitle $decisionMakerTitle): JsonResponse
    {
        return response()->json(['data' => $decisionMakerTitle]);
    }

    public function update(UpdateLookupRequest $request, DecisionMakerTitle $decisionMakerTitle): JsonResponse
    {
        $decisionMakerTitle->update($request->validated());
        return response()->json(['data' => $decisionMakerTitle->fresh()]);
    }

    public function destroy(DecisionMakerTitle $decisionMakerTitle): JsonResponse
    {
        $decisionMakerTitle->delete();
        return response()->json(['message' => __('Decision maker title deleted.')]);
    }
}
