<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $query = Item::query();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', '%' . $search . '%');
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'default_price' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        $item = Item::create($validated);

        return response()->json([
            'message' => __('Item created successfully'),
            'data' => $item,
        ], 201);
    }

    public function show(Item $item)
    {
        return response()->json([
            'data' => $item,
        ]);
    }

    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'default_price' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        $item->update($validated);

        return response()->json([
            'message' => __('Item updated successfully'),
            'data' => $item->fresh(),
        ]);
    }

    public function destroy(Item $item)
    {
        $item->delete();

        return response()->json([
            'message' => __('Item deleted successfully'),
        ]);
    }
}
