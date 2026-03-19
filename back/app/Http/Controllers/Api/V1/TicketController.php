<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Http\Requests\UpdateTicketRequest;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

        $sort = $request->query('sort', 'date');
        $direction = strtolower((string) $request->query('direction', 'desc'));
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'desc';
        }
        if ($sort === 'ticket_number') {
            $query->orderBy('tickets.ticket_number', $direction);
        } elseif ($sort === 'client') {
            $query->leftJoin('clients', 'tickets.client_id', '=', 'clients.id')
                ->orderBy(DB::raw('COALESCE(clients.company_name, clients.name)'), $direction)
                ->select('tickets.*');
        } elseif ($sort === 'status') {
            $query->orderBy('tickets.status', $direction);
        } elseif ($sort === 'date') {
            $query->orderBy('tickets.created_at', $direction);
        } else {
            $query->orderBy('tickets.created_at', $direction);
        }

        $perPage = $request->integer('per_page', 15);
        $tickets = $query->paginate($perPage);

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

    public function stats(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Ticket::class);

        $open = (int) Ticket::where('status', 'open')->count();
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();
        $resolvedToday = (int) Ticket::whereIn('status', ['resolved', 'closed'])
            ->whereBetween('updated_at', [$todayStart, $todayEnd])
            ->count();
        $pending = (int) Ticket::whereIn('status', ['open', 'in_progress'])->count();
        $total = (int) Ticket::count();
        $resolvedTotal = (int) Ticket::whereIn('status', ['resolved', 'closed'])->count();
        $slaPct = $total > 0 ? round($resolvedTotal / $total * 100, 1) : 0;

        return response()->json([
            'data' => [
                'open' => $open,
                'resolved_today' => $resolvedToday,
                'pending' => $pending,
                'sla_response_pct' => $slaPct,
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Ticket::class);

        $query = Ticket::query()->with(['client', 'shipment', 'ticketType', 'priority', 'assignedTo']);

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

        $tickets = $query->orderByDesc('created_at')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="tickets-'.date('Y-m-d').'.csv"',
        ];

        return new StreamedResponse(function () use ($tickets) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel opens the file with correct encoding
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['ticket_number', 'client', 'shipment_bl', 'type', 'priority', 'status', 'assigned_to', 'created_at']);
            foreach ($tickets as $t) {
                // Format as text so Excel displays it (avoids ##########); zero-width space forces text
                $createdAt = $t->created_at
                    ? "\xE2\x80\x8B".$t->created_at->format('Y-m-d H:i:s')
                    : '';
                fputcsv($out, [
                    $t->ticket_number ?? '',
                    $t->client?->name ?? $t->client?->company_name ?? '',
                    $t->shipment?->bl_number ?? '',
                    $t->ticketType?->name ?? '',
                    $t->priority?->name ?? '',
                    $t->status ?? '',
                    $t->assignedTo?->name ?? '',
                    $createdAt,
                ]);
            }
            fclose($out);
        }, 200, $headers);
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
