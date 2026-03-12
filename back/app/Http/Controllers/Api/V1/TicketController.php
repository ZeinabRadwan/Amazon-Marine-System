<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Http\Requests\UpdateTicketRequest;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Ticket::class);

        $query = Ticket::query()->with(['client', 'shipment', 'ticketType', 'priority', 'createdBy', 'assignedTo']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', '%'.$search.'%')
                    ->orWhereHas('client', function ($q) use ($search) {
                        $q->where('name', 'like', '%'.$search.'%')
                            ->orWhere('company_name', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($ticketTypeId = $request->query('ticket_type_id')) {
            $query->where('ticket_type_id', $ticketTypeId);
        }

        if ($priorityId = $request->query('priority_id')) {
            $query->where('priority_id', $priorityId);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($assignedId = $request->query('assigned_to_id')) {
            $query->where('assigned_to_id', $assignedId);
        }

        $perPage = $request->integer('per_page', 15);
        $tickets = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $tickets->items(),
            'meta' => [
                'current_page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
                'per_page' => $tickets->perPage(),
                'total' => $tickets->total(),
            ],
        ]);
    }

    public function store(StoreTicketRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $ticket = new Ticket;
        $ticket->client_id = $validated['client_id'];
        $ticket->shipment_id = $validated['shipment_id'] ?? null;
        $ticket->created_by_id = $request->user()->id;
        $ticket->assigned_to_id = $validated['assigned_to_id'] ?? null;
        $ticket->ticket_type_id = $validated['ticket_type_id'];
        $ticket->priority_id = $validated['priority_id'];
        $ticket->ticket_number = self::generateTicketNumber();
        $ticket->subject = $validated['subject'];
        $ticket->description = $validated['description'] ?? null;
        $ticket->status = 'open';
        $ticket->source = $validated['source'] ?? null;
        $ticket->save();

        return response()->json([
            'data' => $ticket->fresh(['client', 'shipment', 'ticketType', 'priority', 'createdBy', 'assignedTo']),
        ], 201);
    }

    public function show(Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);

        return response()->json([
            'data' => $ticket->load(['client', 'shipment', 'ticketType', 'priority', 'createdBy', 'assignedTo']),
        ]);
    }

    public function update(UpdateTicketRequest $request, Ticket $ticket): JsonResponse
    {
        $ticket->fill($request->validated());
        $ticket->save();

        return response()->json([
            'data' => $ticket->fresh(['client', 'shipment', 'ticketType', 'priority', 'createdBy', 'assignedTo']),
        ]);
    }

    public function destroy(Ticket $ticket): JsonResponse
    {
        $this->authorize('delete', $ticket);

        $ticket->delete();

        return response()->json([
            'message' => 'Ticket deleted.',
        ]);
    }

    private static function generateTicketNumber(): string
    {
        $year = date('Y');
        $lastNumber = Ticket::where('ticket_number', 'like', "TKT-{$year}-%")
            ->orderByDesc('id')
            ->value('ticket_number');

        $seq = $lastNumber ? (int) substr($lastNumber, -4) + 1 : 1;

        return sprintf('TKT-%s-%04d', $year, $seq);
    }
}
