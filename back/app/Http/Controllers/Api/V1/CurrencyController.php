<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurrencyController extends Controller
{
    public function index(Request $request)
    {
        $query = Currency::query();

        if ($request->has('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'unique:currencies,code'],
            'name' => ['required', 'string'],
            'symbol' => ['required', 'string'],
            'exchange_rate' => ['required', 'numeric', 'min:0'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return DB::transaction(function () use ($validated) {
            if ($validated['is_default'] ?? false) {
                Currency::where('is_default', true)->update(['is_default' => false]);
            }

            $currency = Currency::create($validated);

            return response()->json([
                'message' => __('Currency created successfully'),
                'data' => $currency,
            ], 201);
        });
    }

    public function show(Currency $currency)
    {
        return response()->json([
            'data' => $currency,
        ]);
    }

    public function update(Request $request, Currency $currency)
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'unique:currencies,code,' . $currency->id],
            'name' => ['sometimes', 'string'],
            'symbol' => ['sometimes', 'string'],
            'exchange_rate' => ['sometimes', 'numeric', 'min:0'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return DB::transaction(function () use ($validated, $currency) {
            if (isset($validated['is_default']) && $validated['is_default'] && !$currency->is_default) {
                Currency::where('is_default', true)->update(['is_default' => false]);
            }

            $currency->update($validated);

            return response()->json([
                'message' => __('Currency updated successfully'),
                'data' => $currency->fresh(),
            ]);
        });
    }

    public function destroy(Currency $currency)
    {
        // soft deactivate
        $currency->update(['is_active' => false]);

        return response()->json([
            'message' => __('Currency deactivated successfully'),
        ]);
    }
}
