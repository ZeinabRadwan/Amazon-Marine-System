<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ShipmentAttachmentController extends Controller
{
    public function index(Request $request, Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        $attachments = $shipment->attachments()->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $attachments->map(fn (ShipmentAttachment $a) => $this->attachmentPayload($request, $shipment, $a)),
        ]);
    }

    public function store(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,csv,txt,zip,rar,ppt,pptx', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store('shipment-attachments/'.$shipment->id, 'local');

        $attachment = $shipment->attachments()->create([
            'name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json([
            'data' => $this->attachmentPayload($request, $shipment, $attachment),
        ], 201);
    }

    public function download(Shipment $shipment, int|string $attachment)
    {
        $this->authorize('view', $shipment);

        $shipment_attachment = $this->resolveShipmentAttachment($shipment, $attachment);

        $fullPath = $this->resolveAttachmentFilesystemPath($shipment_attachment);

        if ($fullPath === null) {
            abort(404, __('File not found.'));
        }

        return response()->download($fullPath, $shipment_attachment->name, [
            'Content-Type' => $shipment_attachment->mime_type ?? 'application/octet-stream',
        ]);
    }

    public function destroy(Shipment $shipment, int|string $attachment)
    {
        $this->authorize('update', $shipment);

        $shipment_attachment = $this->resolveShipmentAttachment($shipment, $attachment);

        $this->deleteAttachmentFiles($shipment_attachment);
        $shipment_attachment->delete();

        return response()->json(['message' => __('Attachment deleted.')]);
    }

    public function update(Request $request, Shipment $shipment, int|string $attachment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $shipment_attachment = $this->resolveShipmentAttachment($shipment, $attachment);

        $oldName = $shipment_attachment->name;
        $extension = pathinfo($oldName, PATHINFO_EXTENSION);
        $newName = $validated['name'];

        // If the new name doesn't already have the extension, append it
        if ($extension && !str_ends_with($newName, '.' . $extension)) {
            $newName .= '.' . $extension;
        }

        $shipment_attachment->update([
            'name' => $newName,
        ]);

        return response()->json([
            'data' => $this->attachmentPayload($request, $shipment, $shipment_attachment),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function attachmentPayload(Request $request, Shipment $shipment, ShipmentAttachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'name' => $attachment->name,
            'url' => $this->downloadUrl($request, $shipment, $attachment),
            'mime_type' => $attachment->mime_type,
            'size' => $attachment->size,
            'created_at' => $attachment->created_at,
        ];
    }

    protected function downloadUrl(Request $request, Shipment $shipment, ShipmentAttachment $attachment): string
    {
        $base = $request->getSchemeAndHttpHost();

        return $base.'/api/v1/shipments/'.$shipment->id.'/attachments/'.$attachment->id.'/download';
    }

    protected function resolveShipmentAttachment(Shipment $shipment, int|string $attachmentId): ShipmentAttachment
    {
        return ShipmentAttachment::query()
            ->where('shipment_id', $shipment->id)
            ->whereKey((int) $attachmentId)
            ->firstOrFail();
    }

    protected function resolveAttachmentFilesystemPath(ShipmentAttachment $attachment): ?string
    {
        $relative = $attachment->path;
        if ($relative === '' || str_contains($relative, '..')) {
            return null;
        }

        $primary = Storage::disk('local')->path($relative);
        if (is_file($primary)) {
            return $primary;
        }

        return null;
    }

    protected function deleteAttachmentFiles(ShipmentAttachment $attachment): void
    {
        Storage::disk('local')->delete($attachment->path);
    }
}
