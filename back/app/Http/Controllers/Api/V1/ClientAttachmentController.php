<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClientAttachmentController extends Controller
{
    public function index(Request $request, Client $client)
    {
        $this->authorize('view', $client);

        $attachments = $client->attachments()->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $attachments->map(fn (ClientAttachment $a) => $this->attachmentPayload($request, $client, $a)),
        ]);
    }

    public function store(Request $request, Client $client)
    {
        $this->authorize('manageClientContent', $client);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,csv,txt,zip,rar,ppt,pptx', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store('client-attachments/'.$client->id, 'local');

        $attachment = $client->attachments()->create([
            'name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json([
            'data' => $this->attachmentPayload($request, $client, $attachment),
        ], 201);
    }

    public function download(Client $client, int|string $attachment)
    {
        $this->authorize('view', $client);

        $client_attachment = $this->resolveClientAttachment($client, $attachment);

        $fullPath = $this->resolveAttachmentFilesystemPath($client_attachment);

        if ($fullPath === null) {
            abort(404, __('File not found.'));
        }

        return response()->download($fullPath, $client_attachment->name, [
            'Content-Type' => $client_attachment->mime_type ?? 'application/octet-stream',
        ]);
    }

    public function destroy(Client $client, int|string $attachment)
    {
        $this->authorize('manageClientContent', $client);

        $client_attachment = $this->resolveClientAttachment($client, $attachment);

        $this->deleteAttachmentFiles($client_attachment);
        $client_attachment->delete();

        return response()->json(['message' => __('Attachment deleted.')]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function attachmentPayload(Request $request, Client $client, ClientAttachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'name' => $attachment->name,
            'url' => $this->downloadUrl($request, $client, $attachment),
            'mime_type' => $attachment->mime_type,
            'size' => $attachment->size,
            'created_at' => $attachment->created_at,
        ];
    }

    protected function downloadUrl(Request $request, Client $client, ClientAttachment $attachment): string
    {
        $base = $request->getSchemeAndHttpHost();

        return $base.'/api/v1/clients/'.$client->id.'/attachments/'.$attachment->id.'/download';
    }

    protected function resolveClientAttachment(Client $client, int|string $attachmentId): ClientAttachment
    {
        return ClientAttachment::query()
            ->where('client_id', $client->id)
            ->whereKey((int) $attachmentId)
            ->firstOrFail();
    }

    /**
     * Prefer the configured local disk (storage/app/private); fall back to legacy storage/app paths.
     *
     * @return string|null Absolute path if the file exists
     */
    protected function resolveAttachmentFilesystemPath(ClientAttachment $attachment): ?string
    {
        $relative = $attachment->path;
        if ($relative === '' || str_contains($relative, '..')) {
            return null;
        }

        $primary = Storage::disk('local')->path($relative);
        if (is_file($primary)) {
            return $primary;
        }

        $legacy = storage_path('app/'.$relative);
        if (is_file($legacy)) {
            return $legacy;
        }

        return null;
    }

    protected function deleteAttachmentFiles(ClientAttachment $attachment): void
    {
        Storage::disk('local')->delete($attachment->path);

        $relative = $attachment->path;
        if ($relative !== '' && ! str_contains($relative, '..')) {
            $legacy = storage_path('app/'.$relative);
            if (is_file($legacy)) {
                @unlink($legacy);
            }
        }
    }
}
