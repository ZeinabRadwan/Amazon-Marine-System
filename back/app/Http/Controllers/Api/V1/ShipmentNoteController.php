<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShipmentNoteController extends Controller
{
    /**
     * List notes for a shipment.
     */
    public function index(Shipment $shipment): JsonResponse
    {
        $this->authorize('view', $shipment);

        $notes = $shipment->notes()
            ->with('author:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $notes->map(fn (Note $n) => [
                'id' => $n->id,
                'content' => $n->content,
                'author_id' => $n->author_id,
                'author' => $n->author ? ['id' => $n->author->id, 'name' => $n->author->name] : null,
                'created_at' => $n->created_at,
            ]),
        ]);
    }

    /**
     * Add a note for a shipment (ملاحظات الشحنة).
     */
    public function store(Request $request, Shipment $shipment): JsonResponse
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:65535'],
        ]);

        $note = new Note;
        $note->noteable_type = Shipment::class;
        $note->noteable_id = $shipment->id;
        $note->author_id = $request->user()->id;
        $note->content = $validated['content'];
        $note->save();

        return response()->json([
            'data' => [
                'id' => $note->id,
                'content' => $note->content,
                'author_id' => $note->author_id,
                'created_at' => $note->created_at,
            ],
        ], 201);
    }
}
