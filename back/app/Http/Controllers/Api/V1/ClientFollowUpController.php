<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientFollowUp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientFollowUpController extends Controller
{
    /**
     * List follow-ups (متابعات) for a client.
     */
    public function index(Client $client): JsonResponse
    {
        $this->authorize('view', $client);

        $followUps = $client->followUps()
            ->with('createdBy:id,name')
            ->orderByDesc('occurred_at')
            ->get();

        return response()->json([
            'data' => $followUps->map(fn (ClientFollowUp $f) => [
                'id' => $f->id,
                'type' => $f->type,
                'occurred_at' => $f->occurred_at,
                'summary' => $f->summary,
                'next_follow_up_at' => $f->next_follow_up_at,
                'created_by_id' => $f->created_by_id,
                'created_by' => $f->createdBy ? ['id' => $f->createdBy->id, 'name' => $f->createdBy->name] : null,
                'created_at' => $f->created_at,
            ]),
        ]);
    }

    /**
     * Add a follow-up (إضافة متابعة) for a client.
     */
    public function store(Request $request, Client $client): JsonResponse
    {
        $this->authorize('update', $client);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:phone,email,visit,whatsapp,meeting'],
            'occurred_at' => ['required', 'date'],
            'summary' => ['nullable', 'string', 'max:65535'],
            'next_follow_up_at' => ['nullable', 'date'],
        ]);

        $followUp = new ClientFollowUp;
        $followUp->client_id = $client->id;
        $followUp->type = $validated['type'];
        $followUp->occurred_at = $validated['occurred_at'];
        $followUp->summary = $validated['summary'] ?? null;
        $followUp->next_follow_up_at = $validated['next_follow_up_at'] ?? null;
        $followUp->created_by_id = $request->user()->id;
        $followUp->save();

        return response()->json([
            'data' => [
                'id' => $followUp->id,
                'type' => $followUp->type,
                'occurred_at' => $followUp->occurred_at,
                'summary' => $followUp->summary,
                'next_follow_up_at' => $followUp->next_follow_up_at,
                'created_by_id' => $followUp->created_by_id,
                'created_at' => $followUp->created_at,
            ],
        ], 201);
    }
}
