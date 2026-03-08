<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\InterestLevel;
use Illuminate\Http\JsonResponse;

class InterestLevelController extends Controller
{
    public function index(): JsonResponse
    {
        $items = InterestLevel::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = InterestLevel::create($request->validated());
        return response()->json(['data' => $item], 201);
    }

    public function show(InterestLevel $interestLevel): JsonResponse
    {
        return response()->json(['data' => $interestLevel]);
    }

    public function update(UpdateLookupRequest $request, InterestLevel $interestLevel): JsonResponse
    {
        $interestLevel->update($request->validated());
        return response()->json(['data' => $interestLevel->fresh()]);
    }

    public function destroy(InterestLevel $interestLevel): JsonResponse
    {
        $interestLevel->delete();
        return response()->json(['message' => 'Interest level deleted.']);
    }
}
