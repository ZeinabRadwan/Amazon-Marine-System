<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientAttachment;
use App\Models\FileRecord;
use App\Services\FileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClientAttachmentController extends Controller
{
    protected $fileService;

    public function __construct(FileService $fileService)
    {
        $this->fileService = $fileService;
    }
    public function index(Request $request, Client $client)
    {
        $this->authorize('view', $client);

        // Get legacy attachments
        $legacy = $client->attachments()->orderByDesc('created_at')->get();
        $legacyPayloads = $legacy->map(fn (ClientAttachment $a) => $this->attachmentPayload($request, $client, $a));

        // Get new file records (polymorphic)
        $newFiles = $client->files()->where('collection', 'client_attachments')->orderByDesc('created_at')->get();
        $newPayloads = $newFiles->map(fn (FileRecord $f) => [
            'id' => $f->id,
            'is_new' => true,
            'name' => $f->original_name,
            'url' => $f->getUrl(),
            'mime_type' => $f->mime_type,
            'size' => $f->size,
            'created_at' => $f->created_at,
        ]);

        return response()->json([
            'data' => $newPayloads->concat($legacyPayloads),
        ]);
    }

    public function store(Request $request, Client $client)
    {
        $this->authorize('manageClientContent', $client);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,csv,txt,zip,rar,ppt,pptx', 'max:10240'],
        ]);

        $record = $this->fileService->upload(
            file: $request->file('file'),
            collection: 'client_attachments',
            owner: $client
        );

        return response()->json([
            'data' => [
                'id' => $record->id,
                'is_new' => true,
                'name' => $record->original_name,
                'url' => $record->getUrl(),
                'mime_type' => $record->mime_type,
                'size' => $record->size,
                'created_at' => $record->created_at,
            ],
        ], 201);
    }

    public function download(Client $client, int|string $attachmentId)
    {
        $this->authorize('view', $client);

        // Try to find in FileRecord (new system) first
        $fileRecord = FileRecord::find($attachmentId);
        if ($fileRecord && $fileRecord->fileable_id == $client->id && $fileRecord->fileable_type == Client::class) {
            return response()->streamDownload(function () use ($fileRecord) {
                 echo $fileRecord->getContent();
            }, $fileRecord->original_name);
        }

        // Fallback to legacy ClientAttachment
        $client_attachment = $this->resolveClientAttachment($client, $attachmentId);
        $fullPath = $this->resolveAttachmentFilesystemPath($client_attachment);

        if ($fullPath === null) {
            abort(404, __('File not found.'));
        }

        return response()->download($fullPath, $client_attachment->name, [
            'Content-Type' => $client_attachment->mime_type ?? 'application/octet-stream',
        ]);
    }

    public function destroy(Client $client, int|string $attachmentId)
    {
        $this->authorize('manageClientContent', $client);

        // Try new system first
        $fileRecord = FileRecord::find($attachmentId);
        if ($fileRecord && $fileRecord->fileable_id == $client->id && $fileRecord->fileable_type == Client::class) {
            $this->fileService->delete($fileRecord);
            return response()->json(['message' => __('Attachment deleted.')]);
        }

        // Fallback to legacy
        try {
            $client_attachment = $this->resolveClientAttachment($client, $attachmentId);
            $this->deleteAttachmentFiles($client_attachment);
            $client_attachment->delete();
            return response()->json(['message' => __('Attachment deleted.')]);
        } catch (\Exception $e) {
            abort(404, __('Attachment not found.'));
        }
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
