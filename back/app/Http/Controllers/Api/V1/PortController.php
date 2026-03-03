<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePortRequest;
use App\Http\Requests\UpdatePortRequest;
use App\Models\Port;
use Illuminate\Http\Request;

class PortController extends Controller
{
    public function index(Request $request)
    {
        $query = Port::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('code', 'like', '%' . $search . '%');
            });
        }

        if (($active = $request->query('active')) !== null) {
            $query->where('active', filter_var($active, FILTER_VALIDATE_BOOLEAN));
        }

        $ports = $query->orderBy('name')->get();

        return response()->json([
            'data' => $ports,
        ]);
    }

    public function store(StorePortRequest $request)
    {
        $port = Port::create($request->validated());

        return response()->json([
            'data' => $port,
        ], 201);
    }

    public function update(UpdatePortRequest $request, Port $port)
    {
        $port->fill($request->validated());
        $port->save();

        return response()->json([
            'data' => $port,
        ]);
    }

    public function destroy(Port $port)
    {
        $port->delete();

        return response()->json([
            'message' => 'Port deleted.',
        ]);
    }
}

