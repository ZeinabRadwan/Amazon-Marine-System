<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientNoteController extends Controller
{
    private function noteData(Note $n): array
    {
        return [
            'id' => $n->id,
            'content' => $n->content,
            'author_id' => $n->author_id,
            'author' => $n->author ? ['id' => $n->author->id, 'name' => $n->author->name] : null,
            'created_at' => $n->created_at,
        ];
    }

    private function ensureClientNote(Client $client, Note $note): void
    {
        if ((string) $note->noteable_type !== Client::class || (int) $note->noteable_id !== (int) $client->id) {
            abort(404, __('Note not found for this client.'));
        }
    }

    /**
     * List quick notes (sales guidance) for a client.
     */
    public function index(Client $client): JsonResponse
    {
        $this->authorize('view', $client);

        $notes = $client->notes()
            ->with('author:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $notes->map(fn (Note $n) => $this->noteData($n)),
        ]);
    }

    /**
     * Add a quick note (ملاحظة سريعة) for a client.
     * Accepts either raw content or structured sales-guidance fields.
     */
    public function store(Request $request, Client $client): JsonResponse
    {
        $this->authorize('manageClientContent', $client);

        $validated = $request->validate([
            'content' => ['nullable', 'string', 'max:65535'],
            'current_need' => ['nullable', 'string', 'max:65535'],
            'pain_points' => ['nullable', 'string', 'max:65535'],
            'opportunity' => ['nullable', 'string', 'max:65535'],
            'special_requirements' => ['nullable', 'string', 'max:65535'],
        ]);

        $content = $validated['content'] ?? null;
        if ($content === null && array_key_exists('current_need', $validated)) {
            $content = json_encode([
                'current_need' => $validated['current_need'] ?? '',
                'pain_points' => $validated['pain_points'] ?? '',
                'opportunity' => $validated['opportunity'] ?? '',
                'special_requirements' => $validated['special_requirements'] ?? '',
            ], JSON_UNESCAPED_UNICODE);
        }
        if ($content === null) {
            $content = '';
        }

        $note = new Note;
        $note->noteable_type = Client::class;
        $note->noteable_id = $client->id;
        $note->author_id = $request->user()->id;
        $note->content = $content;
        $note->save();

        return response()->json([
            'data' => $this->noteData($note->fresh('author:id,name')),
        ], 201);
    }

    /**
     * Update a quick note for a client.
     */
    public function update(Request $request, Client $client, Note $note): JsonResponse
    {
        $this->authorize('manageClientContent', $client);
        $this->ensureClientNote($client, $note);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:65535'],
        ]);

        $note->content = $validated['content'];
        $note->save();

        return response()->json([
            'data' => $this->noteData($note->fresh('author:id,name')),
        ]);
    }

    /**
     * Delete a quick note for a client.
     */
    public function destroy(Request $request, Client $client, Note $note): JsonResponse
    {
        $this->authorize('manageClientContent', $client);
        $this->ensureClientNote($client, $note);

        $note->delete();

        return response()->json([
            'message' => __('Note deleted.'),
        ]);
    }
}
