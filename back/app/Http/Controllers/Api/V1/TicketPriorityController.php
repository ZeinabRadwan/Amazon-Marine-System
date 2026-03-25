<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketPriorityRequest;
use App\Http\Requests\UpdateTicketPriorityRequest;
use App\Models\TicketPriority;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketPriorityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('tickets.view') && ! $request->user()?->can('tickets.manage') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        $priorities = TicketPriority::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $priorities->map(fn (TicketPriority $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'label_ar' => $p->label_ar,
                'sort_order' => (int) $p->sort_order,
            ]),
        ]);
    }

    public function store(StoreTicketPriorityRequest $request): JsonResponse
    {
        $priority = TicketPriority::query()->create($request->validated());

        return response()->json([
            'data' => [
                'id' => $priority->id,
                'name' => $priority->name,
                'label_ar' => $priority->label_ar,
                'sort_order' => (int) $priority->sort_order,
            ],
        ], 201);
    }

    public function show(Request $request, TicketPriority $ticketPriority): JsonResponse
    {
        if (! $request->user()?->can('tickets.view') && ! $request->user()?->can('tickets.manage') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        return response()->json([
            'data' => [
                'id' => $ticketPriority->id,
                'name' => $ticketPriority->name,
                'label_ar' => $ticketPriority->label_ar,
                'sort_order' => (int) $ticketPriority->sort_order,
            ],
        ]);
    }

    public function update(UpdateTicketPriorityRequest $request, TicketPriority $ticketPriority): JsonResponse
    {
        $ticketPriority->fill($request->validated());
        $ticketPriority->save();

        return response()->json([
            'data' => [
                'id' => $ticketPriority->id,
                'name' => $ticketPriority->name,
                'label_ar' => $ticketPriority->label_ar,
                'sort_order' => (int) $ticketPriority->sort_order,
            ],
        ]);
    }

    public function destroy(Request $request, TicketPriority $ticketPriority): JsonResponse
    {
        if (! $request->user()?->can('tickets.manage') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        $ticketPriority->delete();

        return response()->json([
            'message' => __('Ticket priority deleted.'),
        ]);
    }
}
