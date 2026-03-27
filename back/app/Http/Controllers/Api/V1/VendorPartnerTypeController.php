<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVendorPartnerTypeRequest;
use App\Http\Requests\UpdateVendorPartnerTypeRequest;
use App\Models\Vendor;
use App\Models\VendorPartnerType;
use Illuminate\Http\JsonResponse;

class VendorPartnerTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $items = VendorPartnerType::query()
            ->orderBy('sort_order')
            ->orderBy('name_en')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(StoreVendorPartnerTypeRequest $request): JsonResponse
    {
        $item = VendorPartnerType::create($request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function show(VendorPartnerType $vendorPartnerType): JsonResponse
    {
        return response()->json(['data' => $vendorPartnerType]);
    }

    public function update(UpdateVendorPartnerTypeRequest $request, VendorPartnerType $vendorPartnerType): JsonResponse
    {
        $vendorPartnerType->update($request->validated());

        return response()->json(['data' => $vendorPartnerType->fresh()]);
    }

    public function destroy(VendorPartnerType $vendorPartnerType): JsonResponse
    {
        $inUse = Vendor::query()
            ->where('type', $vendorPartnerType->code)
            ->exists();

        abort_if(
            $inUse,
            422,
            __('Cannot delete a partner type that is assigned to one or more vendors.')
        );

        $vendorPartnerType->delete();

        return response()->json(['message' => __('Partner type deleted.')]);
    }
}
