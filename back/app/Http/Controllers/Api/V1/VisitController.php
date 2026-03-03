<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVisitRequest;
use App\Http\Requests\UpdateVisitRequest;
use App\Models\Visit;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    public function index(Request $request)
    {
        $query = Visit::query()->with(['client', 'user']);

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('visit_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('visit_date', '<=', $to);
        }

        $visits = $query->orderByDesc('visit_date')->get();

        return response()->json([
            'data' => $visits,
        ]);
    }

    public function store(StoreVisitRequest $request)
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;

        $visit = Visit::create($data);

        return response()->json([
            'data' => $visit->fresh(['client', 'user']),
        ], 201);
    }

    public function show(Visit $visit)
    {
        return response()->json([
            'data' => $visit->load(['client', 'user']),
        ]);
    }

    public function update(UpdateVisitRequest $request, Visit $visit)
    {
        $visit->fill($request->validated());
        $visit->save();

        return response()->json([
            'data' => $visit->fresh(['client', 'user']),
        ]);
    }

    public function destroy(Visit $visit)
    {
        $visit->delete();

        return response()->json([
            'message' => 'Visit deleted.',
        ]);
    }
}

