<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommunicationLogRequest;
use App\Models\CommunicationLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunicationLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CommunicationLog::class);

        $query = CommunicationLog::query()
            ->with(['client', 'shipment', 'ticket', 'type', 'createdBy']);

        if ($typeId = $request->query('communication_log_type_id')) {
            $query->where('communication_log_type_id', $typeId);
        }

        if ($request->query('related') === 'client') {
            $query->whereNotNull('client_id');
        }
        if ($request->query('related') === 'shipment') {
            $query->whereNotNull('shipment_id');
        }
        if ($request->query('related') === 'ticket') {
            $query->whereNotNull('ticket_id');
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }
        if ($shipmentId = $request->query('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
        }
        if ($ticketId = $request->query('ticket_id')) {
            $query->where('ticket_id', $ticketId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', '%'.$search.'%')
                    ->orWhere('client_said', 'like', '%'.$search.'%')
                    ->orWhere('issue', 'like', '%'.$search.'%')
                    ->orWhere('reply', 'like', '%'.$search.'%');
            });
        }

        $sort = $request->query('sort', 'date_time');
        $direction = strtolower((string) $request->query('direction', 'desc'));
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }
        if ($sort === 'date_time' || $sort === 'occurred_at') {
            $query->orderBy('communication_logs.occurred_at', $direction)->orderBy('communication_logs.created_at', $direction);
        } elseif ($sort === 'subject') {
            $query->orderBy('communication_logs.subject', $direction);
        } elseif ($sort === 'type') {
            $query->orderBy('communication_logs.communication_log_type_id', $direction)->orderBy('communication_logs.occurred_at', $direction);
        } else {
            $query->orderBy('communication_logs.occurred_at', $direction)->orderBy('communication_logs.created_at', $direction);
        }

        $perPage = $request->integer('per_page', 15);
        $logs = $query->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    public function store(StoreCommunicationLogRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $log = new CommunicationLog;
        $log->client_id = $validated['client_id'] ?? null;
        $log->shipment_id = $validated['shipment_id'] ?? null;
        $log->ticket_id = $validated['ticket_id'] ?? null;
        $log->communication_log_type_id = $validated['communication_log_type_id'];
        $log->subject = $validated['subject'] ?? null;
        $log->client_said = $validated['client_said'] ?? null;
        $log->issue = $validated['issue'] ?? null;
        $log->reply = $validated['reply'] ?? null;
        $log->created_by_id = $request->user()->id;
        $log->occurred_at = $validated['occurred_at'] ?? now();
        $log->save();

        return response()->json([
            'data' => $log->fresh(['client', 'shipment', 'ticket', 'type', 'createdBy']),
        ], 201);
    }

    public function show(CommunicationLog $communicationLog): JsonResponse
    {
        $this->authorize('view', $communicationLog);

        return response()->json([
            'data' => $communicationLog->load(['client', 'shipment', 'ticket', 'type', 'createdBy']),
        ]);
    }
}
