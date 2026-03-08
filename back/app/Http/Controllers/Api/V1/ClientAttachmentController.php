<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClientAttachmentController extends Controller
{
    public function index(Client $client)
    {
        $this->authorize('view', $client);

        $attachments = $client->attachments()->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $attachments->map(fn (ClientAttachment $a) => [
                'id' => $a->id,
                'name' => $a->name,
                'path' => $a->path,
                'mime_type' => $a->mime_type,
                'size' => $a->size,
                'created_at' => $a->created_at,
            ]),
        ]);
    }

    public function store(Request $request, Client $client)
    {
        $this->authorize('update', $client);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store('client-attachments/' . $client->id, 'local');

        $attachment = $client->attachments()->create([
            'name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json([
            'data' => [
                'id' => $attachment->id,
                'name' => $attachment->name,
                'path' => $attachment->path,
                'mime_type' => $attachment->mime_type,
                'size' => $attachment->size,
                'created_at' => $attachment->created_at,
            ],
        ], 201);
    }

    public function destroy(Client $client, ClientAttachment $client_attachment)
    {
        $this->authorize('update', $client);

        if ($client_attachment->client_id !== $client->id) {
            abort(404);
        }

        Storage::disk('local')->delete($client_attachment->path);
        $client_attachment->delete();

        return response()->json(['message' => 'Attachment deleted.']);
    }
}
