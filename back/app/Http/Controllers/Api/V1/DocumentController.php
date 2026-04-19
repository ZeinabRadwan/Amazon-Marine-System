<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Services\FileService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('documents.view') && ! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view documents.'));
        }

        $query = Document::query()->with('uploadedBy');

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $documents = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $documents->map(fn (Document $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'type' => $d->type,
                'mime_type' => $d->mime_type,
                'size' => (int) $d->size,
                'uploaded_by_id' => $d->uploaded_by_id,
                'uploaded_by_name' => $d->uploadedBy?->name,
                'created_at' => $d->created_at?->toIso8601String(),
                'preview_url' => url('api/v1/documents/'.$d->id.'/preview'),
                'download_url' => url('api/v1/documents/'.$d->id.'/download'),
            ]),
        ]);
    }

    public function store(Request $request, FileService $fileService): JsonResponse
    {
        if (! $request->user()?->can('documents.manage') && ! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to upload documents.'));
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:company,template'],
            'file' => ['required', 'file', 'max:20480'],
            'disk' => ['sometimes', 'string', 'in:local,google_drive'],
        ]);

        $document = new Document();
        $document->name = $validated['name'];
        $document->type = $validated['type'];
        $document->uploaded_by_id = $request->user()->id;
        $document->save();

        $fileRecord = $fileService->upload(
            file: $request->file('file'),
            collection: 'documents',
            diskName: $request->input('disk'),
            owner: $document
        );

        return response()->json([
            'data' => [
                'id' => $document->id,
                'name' => $document->name,
                'type' => $document->type,
                'file_record' => $fileRecord,
                'created_at' => $document->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function download(Request $request, Document $document): StreamedResponse|JsonResponse|BinaryFileResponse|\Illuminate\Http\RedirectResponse
    {
        if (! $request->user()?->can('documents.view') && ! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to download documents.'));
        }

        $fileRecord = $document->files()->latest()->first();

        if (! $fileRecord) {
            if ($document->path && Storage::disk('local')->exists($document->path)) {
                return Storage::disk('local')->download($document->path, $document->name);
            }
            return response()->json(['message' => __('File not found.')], 404);
        }

        return redirect($fileRecord->getUrl());
    }

    public function preview(Request $request, Document $document): BinaryFileResponse|JsonResponse|\Illuminate\Http\RedirectResponse
    {
        if (! $request->user()?->can('documents.view') && ! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view documents.'));
        }

        $fileRecord = $document->files()->latest()->first();

        if (! $fileRecord) {
            if ($document->path && Storage::disk('local')->exists($document->path)) {
                return response()->file(Storage::disk('local')->path($document->path));
            }
            return response()->json(['message' => __('File not found.')], 404);
        }

        return redirect($fileRecord->getUrl());
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        if (! $request->user()?->can('documents.manage') && ! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to delete documents.'));
        }

        if (Storage::disk('local')->exists($document->path)) {
            Storage::disk('local')->delete($document->path);
        }

        $document->delete();

        return response()->json([
            'message' => __('Document deleted.'),
        ]);
    }
}
