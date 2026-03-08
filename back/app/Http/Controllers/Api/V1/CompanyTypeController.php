<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLookupRequest;
use App\Http\Requests\UpdateLookupRequest;
use App\Models\CompanyType;
use Illuminate\Http\JsonResponse;

class CompanyTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $items = CompanyType::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['data' => $items]);
    }

    public function store(StoreLookupRequest $request): JsonResponse
    {
        $item = CompanyType::create($request->validated());
        return response()->json(['data' => $item], 201);
    }

    public function show(CompanyType $companyType): JsonResponse
    {
        return response()->json(['data' => $companyType]);
    }

    public function update(UpdateLookupRequest $request, CompanyType $companyType): JsonResponse
    {
        $companyType->update($request->validated());
        return response()->json(['data' => $companyType->fresh()]);
    }

    public function destroy(CompanyType $companyType): JsonResponse
    {
        $companyType->delete();
        return response()->json(['message' => 'Company type deleted.']);
    }
}
