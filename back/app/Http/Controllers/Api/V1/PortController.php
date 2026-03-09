<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Port;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Port::query();

        if (! is_null($request->query('active'))) {
            $active = filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (! is_null($active)) {
                $query->where('active', $active);
            }
        }

        if ($search = $request->query('q')) {
            $query->where(function ($q2) use ($search) {
                $q2->where('name', 'like', '%' . $search . '%')
                    ->orWhere('code', 'like', '%' . $search . '%')
                    ->orWhere('country', 'like', '%' . $search . '%');
            });
        }

        $ports = $query->orderBy('name')->get();

        return response()->json(['data' => $ports]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $port = Port::create($validated);

        return response()->json(['data' => $port], 201);
    }

    public function show(Port $port): JsonResponse
    {
        return response()->json(['data' => $port]);
    }

    public function update(Request $request, Port $port): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'country' => ['sometimes', 'nullable', 'string', 'max:100'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $port->update($validated);

        return response()->json(['data' => $port->fresh()]);
    }

    public function destroy(Port $port): JsonResponse
    {
        $port->delete();

        return response()->json(['message' => 'Port deleted.']);
    }
}

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

