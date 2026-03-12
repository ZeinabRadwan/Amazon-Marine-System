<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketTypeRequest;
use App\Http\Requests\UpdateTicketTypeRequest;
use App\Models\TicketType;
use Illuminate\Http\JsonResponse;

class TicketTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', TicketType::class);

        $items = TicketType::orderBy('name')->get();

        return response()->json(['data' => $items]);
    }

    public function store(StoreTicketTypeRequest $request): JsonResponse
    {
        $item = TicketType::create($request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function show(TicketType $ticketType): JsonResponse
    {
        $this->authorize('view', $ticketType);

        return response()->json(['data' => $ticketType]);
    }

    public function update(UpdateTicketTypeRequest $request, TicketType $ticketType): JsonResponse
    {
        $ticketType->update($request->validated());

        return response()->json(['data' => $ticketType->fresh()]);
    }

    public function destroy(TicketType $ticketType): JsonResponse
    {
        $this->authorize('delete', $ticketType);

        $ticketType->delete();

        return response()->json(['message' => 'Ticket type deleted.']);
    }
}
