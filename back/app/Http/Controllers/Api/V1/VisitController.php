<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVisitRequest;
use App\Http\Requests\UpdateVisitRequest;
use App\Models\Client;
use App\Models\ClientFollowUp;
use App\Models\Vendor;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class VisitController extends Controller
{
    public function index(Request $request)
    {
        $query = Visit::query()->with(['visitable', 'user']);

        if ($clientId = $request->query('client_id')) {
            $query->where('visitable_type', Client::class)->where('visitable_id', $clientId);
        }

        if ($vendorId = $request->query('vendor_id')) {
            $query->where('visitable_type', Vendor::class)->where('visitable_id', $vendorId);
        }

        if ($visitableType = $request->query('visitable_type')) {
            $query->where('visitable_type', $visitableType);
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

        if ($request->filled('client_id')) {
            $data['visitable_type'] = Client::class;
            $data['visitable_id'] = $data['client_id'];
        } else {
            $data['visitable_type'] = Vendor::class;
            $data['visitable_id'] = $data['vendor_id'];
        }
        unset($data['client_id'], $data['vendor_id']);

        $visit = Visit::create($data);

        return response()->json([
            'data' => $visit->fresh(['visitable', 'user']),
        ], 201);
    }

    public function show(Visit $visit)
    {
        return response()->json([
            'data' => $visit->load(['visitable', 'user']),
        ]);
    }

    public function update(UpdateVisitRequest $request, Visit $visit)
    {
        $data = $request->validated();

        if ($request->filled('client_id')) {
            $visit->visitable_type = Client::class;
            $visit->visitable_id = $data['client_id'];
        } elseif ($request->filled('vendor_id')) {
            $visit->visitable_type = Vendor::class;
            $visit->visitable_id = $data['vendor_id'];
        }
        unset($data['client_id'], $data['vendor_id']);

        $visit->fill($data);
        $visit->save();

        return response()->json([
            'data' => $visit->fresh(['visitable', 'user']),
        ]);
    }

    public function destroy(Visit $visit)
    {
        $visit->delete();

        return response()->json([
            'message' => __('Visit deleted.'),
        ]);
    }

    /**
     * List visits for a vendor (partner).
     */
    public function indexForVendor(Request $request, Vendor $vendor)
    {
        $visits = $vendor->visits()
            ->with(['user'])
            ->orderByDesc('visit_date')
            ->get();

        return response()->json([
            'data' => $visits->map(fn (Visit $v) => [
                'id' => $v->id,
                'vendor_id' => $v->visitable_id,
                'visitable_type' => $v->visitable_type,
                'visitable_id' => $v->visitable_id,
                'user_id' => $v->user_id,
                'user_name' => $v->user?->name,
                'subject' => $v->subject,
                'purpose' => $v->purpose,
                'notes' => $v->notes,
                'visit_date' => $v->visit_date,
                'status' => $v->status,
                'created_at' => $v->created_at,
            ]),
        ]);
    }

    public function stats(Request $request)
    {
        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();

        $query = Visit::query()->whereBetween('visit_date', [$from, $to]);

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($visitableType = $request->query('visitable_type')) {
            $type = $visitableType === 'client' ? Client::class : Vendor::class;
            $query->where('visitable_type', $type);
        }

        $visits = $query->with(['user', 'visitable'])->get();

        $total = $visits->count();
        $successful = $visits->where('status', 'successful')->count();

        $clientIdsFromVisits = $visits->filter(fn (Visit $v) => $v->visitable_type === Client::class)->pluck('visitable_id')->unique()->values();
        $newClientsFromVisits = Client::whereIn('id', $clientIdsFromVisits)->whereBetween('created_at', [$from, $to])->count();

        $topRep = $visits->whereNotNull('user_id')->groupBy('user_id')->map(fn ($group) => $group->count())->sortDesc()->keys()->first();
        $topRepUser = $topRep ? \App\Models\User::find($topRep) : null;

        return response()->json([
            'data' => [
                'total_visits' => $total,
                'successful_count' => $successful,
                'new_clients_from_visits' => $newClientsFromVisits,
                'top_rep' => $topRepUser ? [
                    'id' => $topRepUser->id,
                    'name' => $topRepUser->name,
                ] : null,
            ],
        ]);
    }

    public function charts(Request $request)
    {
        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->copy()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->copy()->endOfMonth();

        $query = Visit::query()->whereBetween('visit_date', [$from, $to]);

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($visitableType = $request->query('visitable_type')) {
            $type = $visitableType === 'client' ? Client::class : Vendor::class;
            $query->where('visitable_type', $type);
        }

        $visits = $query->with('user')->get();

        $byRep = $visits->whereNotNull('user_id')->groupBy('user_id')->map(function ($group) {
            $total = $group->count();
            $successful = $group->where('status', 'successful')->count();

            return [
                'user_id' => $group->first()->user_id,
                'user_name' => $group->first()->user?->name ?? '',
                'total' => $total,
                'successful' => $successful,
                'success_rate_pct' => $total > 0 ? round($successful / $total * 100, 1) : 0,
            ];
        })->values();

        $byStatus = $visits->groupBy('status')->map(fn ($group, $status) => [
            'status' => $status ?? 'unknown',
            'count' => $group->count(),
        ])->values();

        return response()->json([
            'data' => [
                'success_by_rep' => $byRep,
                'visits_by_status' => $byStatus,
            ],
        ]);
    }

    public function followUpsPending(Request $request)
    {
        $today = now()->toDateString();

        $followUps = ClientFollowUp::query()
            ->whereNotNull('next_follow_up_at')
            ->whereDate('next_follow_up_at', '<=', $today)
            ->with(['client', 'createdBy'])
            ->orderBy('next_follow_up_at')
            ->limit(50)
            ->get();

        $items = $followUps->map(fn (ClientFollowUp $f) => [
            'id' => $f->id,
            'client_id' => $f->client_id,
            'client_name' => $f->client?->name ?? $f->client?->company_name ?? '',
            'next_follow_up_at' => $f->next_follow_up_at?->toDateString(),
            'summary' => $f->summary,
            'type' => $f->type,
            'created_by_name' => $f->createdBy?->name ?? '',
        ]);

        return response()->json([
            'data' => $items,
        ]);
    }
}

