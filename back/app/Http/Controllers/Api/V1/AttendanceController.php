<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\ClockAttendanceRequest;
use App\Http\Responses\ApiResponse;
use App\Models\AttendanceLog;
use App\Models\AttendanceRecord;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

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

        if ($request->filled('status')) {
            $status = (string) $request->query('status');
            if ($status === AttendanceRecord::STATUS_ABSENT) {
                $query->whereNull('check_in_at');
            } elseif ($status === AttendanceRecord::STATUS_EXCUSED) {
                $query->where('status', AttendanceRecord::STATUS_EXCUSED);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('device_type')) {
            $query->where('clock_in_device_type', $request->query('device_type'));
        }

        if ($request->filled('is_within_radius')) {
            $raw = $request->query('is_within_radius');
            if ($raw === '1' || $raw === '0' || $raw === 1 || $raw === 0) {
                $query->where('clock_in_is_within_radius', filter_var($raw, FILTER_VALIDATE_BOOLEAN));
            }
        }

        $records = $query->orderByDesc('date')->orderByDesc('check_in_at')->limit(500)->get();
        $viewer = $request->user();

        $clockInLogMap = $this->acceptedClockInLogsByUserAndRecordDate($records);

        $data = $records->map(function (AttendanceRecord $r) use ($viewer, $clockInLogMap) {
            $key = $r->date ? $r->user_id.'|'.$r->date->toDateString() : null;
            $log = $key !== null ? ($clockInLogMap[$key] ?? null) : null;

            return $this->serializeListRecord($r, $viewer, $log);
        });

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

        $clockInLogMap = $this->acceptedClockInLogsByUserAndRecordDate($records);

        return ApiResponse::success([
            'date' => $date,
            'records' => $records->map(function (AttendanceRecord $r) use ($viewer, $clockInLogMap) {
                $key = $r->date ? $r->user_id.'|'.$r->date->toDateString() : null;
                $log = $key !== null ? ($clockInLogMap[$key] ?? null) : null;

                return $this->serializeListRecord($r, $viewer, $log);
            }),
        ]);
    }

    /**
     * Latest accepted clock-in log per user per calendar day (UTC date of attempted_at).
     *
     * @param  Collection<int, AttendanceRecord>  $records
     * @return array<string, AttendanceLog>
     */
    private function acceptedClockInLogsByUserAndRecordDate(Collection $records): array
    {
        if ($records->isEmpty()) {
            return [];
        }

        $userIds = $records->pluck('user_id')->unique()->values()->all();
        $dates = $records->pluck('date')->filter()->map(fn ($d) => $d->toDateString())->unique()->values()->all();
        if ($userIds === [] || $dates === []) {
            return [];
        }

        $minDate = min($dates);
        $maxDate = max($dates);

        $logs = AttendanceLog::query()
            ->where('type', AttendanceLog::TYPE_CLOCK_IN)
            ->where('accepted', true)
            ->whereIn('user_id', $userIds)
            ->whereDate('attempted_at', '>=', $minDate)
            ->whereDate('attempted_at', '<=', $maxDate)
            ->orderByDesc('attempted_at')
            ->get();

        $map = [];
        foreach ($logs as $log) {
            $key = $log->user_id.'|'.$log->attempted_at->utc()->toDateString();
            if (! array_key_exists($key, $map)) {
                $map[$key] = $log;
            }
        }

        return $map;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeListRecord(AttendanceRecord $r, User $viewer, ?AttendanceLog $clockInLog = null): array
    {
        $tz = $this->attendanceService->resolveTimezone($viewer);

        $deviceType = $r->clock_in_device_type;
        $distanceM = $r->clock_in_distance_from_office;
        $withinRadius = $r->clock_in_is_within_radius;

        if ($clockInLog !== null) {
            if ($deviceType === null || $deviceType === '') {
                $deviceType = $clockInLog->device_type;
            }
            if ($distanceM === null && $clockInLog->distance_from_office !== null) {
                $distanceM = (float) $clockInLog->distance_from_office;
            }
            if ($withinRadius === null && $clockInLog->is_within_radius !== null) {
                $withinRadius = (bool) $clockInLog->is_within_radius;
            }
        }

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
            'device_type' => $deviceType,
            'is_within_radius' => $withinRadius,
            'distance_from_office_m' => $distanceM,
            'notes' => $r->notes,
            'timezone_used' => $tz,
        ];
    }
}
