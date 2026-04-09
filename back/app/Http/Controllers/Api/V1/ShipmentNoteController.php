<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ShipmentNoteController extends Controller
{
    /**
     * List notes for a shipment.
     */
    public function index(Shipment $shipment): JsonResponse
    {
        $this->authorize('view', $shipment);

        $notes = $shipment->timelineNotes()
            ->with('author:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $notes->map(fn (Note $n) => $this->notePayload($n)),
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
        $note->load('author:id,name');

        return response()->json([
            'data' => $this->notePayload($note),
        ], 201);
    }

    /**
     * Update a note on this shipment (author or notes.manage).
     */
    public function update(Request $request, Shipment $shipment, Note $note): JsonResponse
    {
        $note = $this->noteBelongsToShipment($shipment, $note);

        $this->authorize('update', $note);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:65535'],
        ]);

        $note->content = $validated['content'];
        $note->save();
        $note->load('author:id,name');

        return response()->json([
            'data' => $this->notePayload($note),
        ]);
    }

    /**
     * Delete a note (notes.manage only).
     */
    public function destroy(Shipment $shipment, Note $note): JsonResponse
    {
        $note = $this->noteBelongsToShipment($shipment, $note);

        $this->authorize('delete', $note);

        $note->delete();

        return response()->json(['message' => __('Note deleted.')]);
    }

    /**
     * @return array<string, mixed>
     */
    private function notePayload(Note $note): array
    {
        return [
            'id' => $note->id,
            'content' => $note->content,
            'author_id' => $note->author_id,
            'author' => $note->author ? ['id' => $note->author->id, 'name' => $note->author->name] : null,
            'created_at' => $note->created_at,
            'updated_at' => $note->updated_at,
        ];
    }

    private function noteBelongsToShipment(Shipment $shipment, Note $note): Note
    {
        if ($note->noteable_type !== Shipment::class || (int) $note->noteable_id !== (int) $shipment->id) {
            throw new NotFoundHttpException;
        }

        return $note;
    }
}
