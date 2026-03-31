<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\AdminUpdateExcuseRequest;
use App\Http\Responses\ApiResponse;
use App\Models\AttendanceRecord;
use App\Models\Excuse;
use App\Notifications\ExcuseDecisionNotification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminExcuseController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
    ) {
    }
    public function index(Request $request): JsonResponse
    {
        $query = Excuse::query()->with('user')->orderByDesc('date')->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('employee_id')) {
            $query->where('user_id', (int) $request->query('employee_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->query('date_to'));
        }

        $perPage = min(100, max(1, (int) $request->query('per_page', 50)));
        $paginator = $query->paginate($perPage);

        $data = $paginator->getCollection()->map(function (Excuse $e) {
            return [
                'id' => $e->id,
                'user_id' => $e->user_id,
                'employee_name' => $e->user?->name,
                'date' => $e->date?->toDateString(),
                'reason' => $e->reason,
                'attachment_path' => $e->attachment_path,
                'has_attachment' => $e->attachment_path !== null,
                'status' => $e->status,
                'admin_note' => $e->admin_note,
                'created_at' => $e->created_at?->toIso8601String(),
                'updated_at' => $e->updated_at?->toIso8601String(),
            ];
        });

        return ApiResponse::success([
            'items' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * Stream excuse attachment (PDF / image) for reviewers with manage permission.
     */
    public function attachment(Excuse $excuse)
    {
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

    public function update(AdminUpdateExcuseRequest $request, Excuse $excuse): JsonResponse
    {
        if ($excuse->status !== Excuse::STATUS_PENDING) {
            return ApiResponse::failure('This excuse has already been processed.', null, 422);
        }

        $validated = $request->validated();
        $excuse->status = $validated['status'];
        if (array_key_exists('admin_note', $validated)) {
            $excuse->admin_note = $validated['admin_note'];
        }
        $excuse->save();

        if ($excuse->status === Excuse::STATUS_APPROVED) {
            $this->markAttendanceExcused($excuse);
        }

        $fresh = $excuse->fresh(['user']);

        DB::afterCommit(function () use ($fresh) {
            if ($fresh->user === null) {
                return;
            }

            app(NotificationService::class)->sendDatabaseNotification(
                'excuse.decision',
                $fresh,
                [$fresh->user],
                new ExcuseDecisionNotification($fresh)
            );
        });

        return ApiResponse::success([
            'id' => $fresh->id,
            'user_id' => $fresh->user_id,
            'employee_name' => $fresh->user?->name,
            'date' => $fresh->date?->toDateString(),
            'reason' => $fresh->reason,
            'attachment_path' => $fresh->attachment_path,
            'status' => $fresh->status,
            'admin_note' => $fresh->admin_note,
        ], 'Excuse updated.');
    }

    private function markAttendanceExcused(Excuse $excuse): void
    {
        $dateStr = $excuse->date->toDateString();

        $record = AttendanceRecord::query()->firstOrNew([
            'user_id' => $excuse->user_id,
            'date' => $dateStr,
        ]);

        $record->status = AttendanceRecord::STATUS_EXCUSED;
        $record->save();
    }
}
