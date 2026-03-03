<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Ticket::class);

        $query = Ticket::query()->with(['client', 'createdBy', 'assignedTo']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($assignedId = $request->query('assigned_to_id')) {
            $query->where('assigned_to_id', $assignedId);
        }

        $tickets = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $tickets,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Ticket::class);

        $validated = $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['nullable', 'string', 'in:low,normal,high'],
            'source' => ['nullable', 'string', 'max:30'],
        ]);

        $ticket = new Ticket($validated);
        $ticket->created_by_id = $request->user()->id;
        $ticket->status = 'open';
        $ticket->priority = $validated['priority'] ?? 'normal';
        $ticket->save();

        return response()->json([
            'data' => $ticket->fresh(['client', 'createdBy', 'assignedTo']),
        ], 201);
    }

    public function show(Ticket $ticket)
    {
        $this->authorize('view', $ticket);

        return response()->json([
            'data' => $ticket->load(['client', 'createdBy', 'assignedTo']),
        ]);
    }

    public function update(Request $request, Ticket $ticket)
    {
        $this->authorize('update', $ticket);

        $validated = $request->validate([
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'subject' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:open,in_progress,closed'],
            'priority' => ['sometimes', 'string', 'in:low,normal,high'],
        ]);

        $ticket->fill($validated);
        $ticket->save();

        return response()->json([
            'data' => $ticket->fresh(['client', 'createdBy', 'assignedTo']),
        ]);
    }

    public function destroy(Ticket $ticket)
    {
        $this->authorize('delete', $ticket);

        $ticket->delete();

        return response()->json([
            'message' => 'Ticket deleted.',
        ]);
    }
}

