<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\ClockAttendanceRequest;
use App\Http\Responses\ApiResponse;
use App\Models\AttendanceRecord;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
    ) {}

    public function clockIn(ClockAttendanceRequest $request): JsonResponse
    {
        $result = $this->attendanceService->clockIn($request->user(), $request);

        if (! $result['success']) {
            return ApiResponse::failure($result['message'] ?? 'Unable to clock in.', $result['data'] ?? null, 422);
        }

        return ApiResponse::success($result['data'] ?? null, $result['message'] ?? null, 201);
    }

    public function clockOut(ClockAttendanceRequest $request): JsonResponse
    {
        $result = $this->attendanceService->clockOut($request->user(), $request);

        if (! $result['success']) {
            return ApiResponse::failure($result['message'] ?? 'Unable to clock out.', $result['data'] ?? null, 422);
        }

        return ApiResponse::success($result['data'] ?? null, $result['message'] ?? null);
    }

    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->can('attendance.view') && ! $request->user()?->can('reports.view')) {
            $request->merge(['user_id' => $request->user()->id]);
        }

        $query = AttendanceRecord::query()->with('user');

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($date = $request->query('date')) {
            $query->whereDate('date', $date);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('date', '<=', $to);
        }

        $records = $query->orderByDesc('date')->orderByDesc('check_in_at')->limit(500)->get();
        $viewer = $request->user();

        $data = $records->map(fn (AttendanceRecord $r) => $this->serializeListRecord($r, $viewer));

        return ApiResponse::success($data);
    }

    public function stats(Request $request): JsonResponse
    {
        if (! $request->user()?->can('attendance.view') && ! $request->user()?->can('reports.view')) {
            abort(403, 'You do not have permission to view attendance stats.');
        }

        $date = $request->query('date', now()->toDateString());

        $records = AttendanceRecord::whereDate('date', $date)->get();
        $present = $records->whereNotNull('check_in_at')->count();
        $left = $records->whereNotNull('check_out_at')->count();
        $late = $records->filter(fn (AttendanceRecord $r) => $r->status === AttendanceRecord::STATUS_LATE || $r->is_late)->count();
        $activeUsersCount = (int) User::where('status', 'active')->count();
        $absent = max(0, $activeUsersCount - $present);

        return ApiResponse::success([
            'date' => $date,
            'present' => $present,
            'left' => $left,
            'late' => $late,
            'absent' => $absent,
        ]);
    }

    public function today(Request $request): JsonResponse
    {
        $date = now()->toDateString();
        $viewer = $request->user();

        if ($request->user()?->can('attendance.view') || $request->user()?->can('reports.view')) {
            $records = AttendanceRecord::whereDate('date', $date)->with('user')->get();
        } else {
            $records = AttendanceRecord::where('user_id', $request->user()->id)->whereDate('date', $date)->with('user')->get();
        }

        return ApiResponse::success([
            'date' => $date,
            'records' => $records->map(fn (AttendanceRecord $r) => $this->serializeListRecord($r, $viewer)),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeListRecord(AttendanceRecord $r, User $viewer): array
    {
        $tz = $this->attendanceService->resolveTimezone($viewer);

        return [
            'id' => $r->id,
            'user_id' => $r->user_id,
            'user_name' => $r->user?->name,
            'date' => $r->date?->toDateString(),
            'check_in_at' => $r->check_in_at?->toIso8601String(),
            'check_out_at' => $r->check_out_at?->toIso8601String(),
            'check_in_at_local' => $r->check_in_at ? $r->check_in_at->copy()->timezone($tz)->toIso8601String() : null,
            'check_out_at_local' => $r->check_out_at ? $r->check_out_at->copy()->timezone($tz)->toIso8601String() : null,
            'is_late' => (bool) $r->is_late,
            'status' => $r->status,
            'worked_minutes' => $r->worked_minutes,
            'notes' => $r->notes,
            'timezone_used' => $tz,
        ];
    }
}
