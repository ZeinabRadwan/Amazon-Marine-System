<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientNoteController extends Controller
{
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
            'data' => [
                'id' => $note->id,
                'content' => $note->content,
                'author_id' => $note->author_id,
                'created_at' => $note->created_at,
            ],
        ], 201);
    }
}
