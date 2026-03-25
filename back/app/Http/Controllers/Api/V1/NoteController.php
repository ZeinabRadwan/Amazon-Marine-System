<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Note::class);

        $query = Note::query()->with('author');

        if ($type = $request->query('noteable_type')) {
            $query->where('noteable_type', $type);
        }

        if ($id = $request->query('noteable_id')) {
            $query->where('noteable_id', $id);
        }

        if ($authorId = $request->query('author_id')) {
            $query->where('author_id', $authorId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $notes = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $notes,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Note::class);

        $validated = $request->validate([
            'noteable_type' => ['required', 'string', 'max:255'],
            'noteable_id' => ['required', 'integer'],
            'content' => ['required', 'string'],
            'due_at' => ['nullable', 'date'],
        ]);

        $note = new Note($validated);
        $note->author_id = $request->user()->id;
        $note->save();

        return response()->json([
            'data' => $note->fresh('author'),
        ], 201);
    }

    public function update(Request $request, Note $note)
    {
        $this->authorize('update', $note);

        $validated = $request->validate([
            'content' => ['sometimes', 'string'],
            'due_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $note->fill($validated);
        $note->save();

        return response()->json([
            'data' => $note->fresh('author'),
        ]);
    }

    public function destroy(Note $note)
    {
        $this->authorize('delete', $note);

        $note->delete();

        return response()->json([
            'message' => __('Note deleted.'),
        ]);
    }
}

