<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $query = Client::query()->with('assignedSales');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('code', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        if ($city = $request->query('city')) {
            $query->where('city', $city);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($assignedSalesId = $request->query('assigned_sales_id')) {
            $query->where('assigned_sales_id', $assignedSalesId);
        }

        $clients = $query->orderBy('name')->get();

        return response()->json([
            'data' => $clients,
        ]);
    }

    public function store(StoreClientRequest $request)
    {
        $this->authorize('create', Client::class);

        $client = Client::create($request->validated());

        return response()->json([
            'data' => $client->fresh('assignedSales'),
        ], 201);
    }

    public function show(Client $client)
    {
        $this->authorize('view', $client);

        return response()->json([
            'data' => $client->load('assignedSales', 'contacts'),
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $this->authorize('update', $client);

        $client->fill($request->validated());
        $client->save();

        return response()->json([
            'data' => $client->fresh('assignedSales'),
        ]);
    }

    public function destroy(Client $client)
    {
        $this->authorize('delete', $client);

        $client->delete();

        return response()->json([
            'message' => 'Client deleted.',
        ]);
    }
}

