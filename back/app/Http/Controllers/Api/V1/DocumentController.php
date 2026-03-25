<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()?->can('documents.manage') && ! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to upload documents.'));
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:company,template'],
            'file' => ['required', 'file', 'max:20480'],
        ]);

        $file = $request->file('file');
        $path = $file->store('documents/' . $validated['type'], 'local');

        $document = new Document();
        $document->name = $validated['name'];
        $document->type = $validated['type'];
        $document->path = $path;
        $document->mime_type = $file->getMimeType();
        $document->size = $file->getSize();
        $document->uploaded_by_id = $request->user()->id;
        $document->save();

        return response()->json([
            'data' => [
                'id' => $document->id,
                'name' => $document->name,
                'type' => $document->type,
                'created_at' => $document->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function download(Request $request, Document $document): StreamedResponse|JsonResponse
    {
        if (! $request->user()?->can('documents.view') && ! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to download documents.'));
        }

        if (! Storage::disk('local')->exists($document->path)) {
            return response()->json(['message' => __('File not found.')], 404);
        }

        return Storage::disk('local')->download(
            $document->path,
            $document->name,
            [
                'Content-Type' => $document->mime_type ?? 'application/octet-stream',
            ]
        );
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
