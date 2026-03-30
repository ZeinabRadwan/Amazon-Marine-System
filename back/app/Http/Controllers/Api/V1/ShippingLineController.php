<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ShippingLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShippingLineController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ShippingLine::query();

        if (! is_null($request->query('active'))) {
            $active = filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (! is_null($active)) {
                $query->where('active', $active);
            }
        }

        if ($search = $request->query('q')) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        $lines = $query->orderBy('name')->get();

        return response()->json(['data' => $lines]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('shipping_lines', 'name')],
            'active' => ['sometimes', 'boolean'],
        ]);

        $line = ShippingLine::create($validated);

        return response()->json(['data' => $line], 201);
    }

    public function show(ShippingLine $shipping_line): JsonResponse
    {
        return response()->json(['data' => $shipping_line]);
    }

    public function update(Request $request, ShippingLine $shipping_line): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('shipping_lines', 'name')->ignore($shipping_line->id)],
            'active' => ['sometimes', 'boolean'],
        ]);

        $shipping_line->update($validated);

        return response()->json(['data' => $shipping_line->fresh()]);
    }

    public function destroy(ShippingLine $shipping_line): JsonResponse
    {
        $shipping_line->delete();

        return response()->json(['message' => __('Shipping line deleted.')]);
    }
}
