<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketStatusRequest;
use App\Http\Requests\UpdateTicketStatusRequest;
use App\Models\TicketStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketStatusController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('tickets.view') && ! $request->user()?->can('tickets.manage') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        $statuses = TicketStatus::query()
            ->orderByDesc('active')
            ->orderBy('sort_order')
            ->orderBy('key')
            ->get();

        return response()->json([
            'data' => $statuses->map(fn (TicketStatus $s) => [
                'id' => $s->id,
                'key' => $s->key,
                'label_ar' => $s->label_ar,
                'label_en' => $s->label_en,
                'active' => (bool) $s->active,
                'sort_order' => (int) $s->sort_order,
            ]),
        ]);
    }

    public function show(Request $request, TicketStatus $ticketStatus): JsonResponse
    {
        if (! $request->user()?->can('tickets.view') && ! $request->user()?->can('tickets.manage') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        return response()->json([
            'data' => [
                'id' => $ticketStatus->id,
                'key' => $ticketStatus->key,
                'label_ar' => $ticketStatus->label_ar,
                'label_en' => $ticketStatus->label_en,
                'active' => (bool) $ticketStatus->active,
                'sort_order' => (int) $ticketStatus->sort_order,
            ],
        ]);
    }

    public function store(StoreTicketStatusRequest $request): JsonResponse
    {
        $status = TicketStatus::query()->create($request->validated());

        return response()->json([
            'data' => [
                'id' => $status->id,
                'key' => $status->key,
                'label_ar' => $status->label_ar,
                'label_en' => $status->label_en,
                'active' => (bool) $status->active,
                'sort_order' => (int) $status->sort_order,
            ],
        ], 201);
    }

    public function update(UpdateTicketStatusRequest $request, TicketStatus $ticketStatus): JsonResponse
    {
        $ticketStatus->fill($request->validated());
        $ticketStatus->save();

        return response()->json([
            'data' => [
                'id' => $ticketStatus->id,
                'key' => $ticketStatus->key,
                'label_ar' => $ticketStatus->label_ar,
                'label_en' => $ticketStatus->label_en,
                'active' => (bool) $ticketStatus->active,
                'sort_order' => (int) $ticketStatus->sort_order,
            ],
        ]);
    }

    public function destroy(Request $request, TicketStatus $ticketStatus): JsonResponse
    {
        if (! $request->user()?->can('tickets.manage') && ! $request->user()?->hasRole('admin')) {
            abort(403);
        }

        $ticketStatus->delete();

        return response()->json([
            'message' => 'Ticket status deleted.',
        ]);
    }
}
