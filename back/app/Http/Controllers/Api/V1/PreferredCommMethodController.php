<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\PreferredCommMethod;
use Illuminate\Http\JsonResponse;

class PreferredCommMethodController extends Controller
{
    public function index(): JsonResponse
    {
        $items = PreferredCommMethod::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = PreferredCommMethod::create($request->validated());
        return response()->json(['data' => $item], 201);
    }

    public function show(PreferredCommMethod $preferredCommMethod): JsonResponse
    {
        return response()->json(['data' => $preferredCommMethod]);
    }

    public function update(UpdateLookupRequest $request, PreferredCommMethod $preferredCommMethod): JsonResponse
    {
        $preferredCommMethod->update($request->validated());
        return response()->json(['data' => $preferredCommMethod->fresh()]);
    }

    public function destroy(PreferredCommMethod $preferredCommMethod): JsonResponse
    {
        $preferredCommMethod->delete();
        return response()->json(['message' => 'Preferred comm method deleted.']);
    }
}
