<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\StoreExcuseRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Excuse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExcuseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Excuse::query()->where('user_id', $user->id)->orderByDesc('date')->orderByDesc('id');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $excuses = $query->limit(200)->get();

        return ApiResponse::success($excuses->map(fn (Excuse $e) => $this->serializeExcuse($e)));
    }

    public function store(StoreExcuseRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $path = null;
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store(date('Y/m'), 'excuses');
        }

        $excuse = Excuse::query()->create([
            'user_id' => $request->user()->id,
            'date' => $validated['date'],
            'reason' => $validated['reason'],
            'attachment_path' => $path,
            'status' => Excuse::STATUS_PENDING,
        ]);

        return ApiResponse::success($this->serializeExcuse($excuse->fresh()), 'Excuse submitted.', 201);
    }

    /**
     * Stream the excuse attachment for the owning user only.
     */
    public function attachment(Request $request, Excuse $excuse)
    {
        if ($excuse->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($excuse->attachment_path === null || $excuse->attachment_path === '') {
            return ApiResponse::failure('No attachment for this excuse.', null, 404);
        }

        $disk = Storage::disk('excuses');
        if (! $disk->exists($excuse->attachment_path)) {
            return ApiResponse::failure('Attachment file is missing.', null, 404);
        }

        $absolute = $disk->path($excuse->attachment_path);
        $filename = basename($excuse->attachment_path);

        return response()->file($absolute, [
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeExcuse(Excuse $e): array
    {
        return [
            'id' => $e->id,
            'user_id' => $e->user_id,
            'date' => $e->date?->toDateString(),
            'reason' => $e->reason,
            'attachment_path' => $e->attachment_path,
            'has_attachment' => $e->attachment_path !== null,
            'status' => $e->status,
            'admin_note' => $e->admin_note,
            'created_at' => $e->created_at?->toIso8601String(),
            'updated_at' => $e->updated_at?->toIso8601String(),
        ];
    }
}
