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
        $viewer = $request->user();

        if ($viewer === null) {
            abort(401);
        }

        $isAdminRole = method_exists($viewer, 'hasRole') && $viewer->hasRole('admin');

        $query = AttendanceRecord::query()->with('user');

        if (! $isAdminRole) {
            $query->where('user_id', $viewer->id);
        } elseif ($userId = $request->query('user_id')) {
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

        $fillMissingUsers = $this->shouldFillMissingUsersOnAttendanceList($request);
        $listLimit = $fillMissingUsers ? 5000 : 500;

        $records = $query->orderByDesc('date')->orderByDesc('check_in_at')->limit($listLimit)->get();

        $clockInLogMap = $this->attendanceService->acceptedClockInLogsByUserAndRecordDate($records);

        $data = $records->map(function (AttendanceRecord $r) use ($viewer, $clockInLogMap) {
            $key = $r->date ? $r->user_id.'|'.$r->date->toDateString() : null;
            $log = $key !== null ? ($clockInLogMap[$key] ?? null) : null;

            return $this->serializeListRecord($r, $viewer, $log);
        });

        if ($fillMissingUsers) {
            $dateStr = $this->resolveSingleCalendarDayForAttendanceList($request);
            if ($dateStr !== null) {
                $presentIds = $data->pluck('user_id')->unique()->filter()->all();
                if ($isAdminRole) {
                    $missingUsers = User::query()
                        ->where('status', 'active')
                        ->whereNotIn('id', $presentIds)
                        ->orderBy('name')
                        ->get();
                    foreach ($missingUsers as $u) {
                        $data->push($this->serializeNoRecordAttendanceListRow($u, $dateStr, $viewer));
                    }
                    $data = $data->sortBy(fn (array $row) => mb_strtolower((string) ($row['user_name'] ?? '')))->values();
                } else {
                    if (! in_array($viewer->id, $presentIds, true)) {
                        $data->push($this->serializeNoRecordAttendanceListRow($viewer, $dateStr, $viewer));
                    }
                }
            }
        }

        return ApiResponse::success($data);
    }

    public function stats(Request $request): JsonResponse
    {
        if (! $request->user()?->can('attendance.view') && ! $request->user()?->can('reports.view')) {
            abort(403, __('You do not have permission to view attendance stats.'));
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

        if ($viewer === null) {
            abort(401);
        }

        $isAdminRole = method_exists($viewer, 'hasRole') && $viewer->hasRole('admin');

        if ($isAdminRole) {
            $records = AttendanceRecord::whereDate('date', $date)->with('user')->get();
        } else {
            $records = AttendanceRecord::where('user_id', $viewer->id)
                ->whereDate('date', $date)
                ->with('user')
                ->get();
        }

        $clockInLogMap = $this->attendanceService->acceptedClockInLogsByUserAndRecordDate($records);

        $recordRows = $records->map(function (AttendanceRecord $r) use ($viewer, $clockInLogMap) {
            $key = $r->date ? $r->user_id.'|'.$r->date->toDateString() : null;
            $log = $key !== null ? ($clockInLogMap[$key] ?? null) : null;

            return $this->serializeListRecord($r, $viewer, $log);
        });

        $presentIds = $recordRows->pluck('user_id')->unique()->filter()->all();
        if ($isAdminRole) {
            $missingUsers = User::query()
                ->where('status', 'active')
                ->whereNotIn('id', $presentIds)
                ->orderBy('name')
                ->get();
            foreach ($missingUsers as $u) {
                $recordRows->push($this->serializeNoRecordAttendanceListRow($u, $date, $viewer));
            }
            $recordRows = $recordRows->sortBy(fn (array $row) => mb_strtolower((string) ($row['user_name'] ?? '')))->values();
        } else {
            if (! in_array($viewer->id, $presentIds, true)) {
                $recordRows->push($this->serializeNoRecordAttendanceListRow($viewer, $date, $viewer));
            }
        }

        return ApiResponse::success([
            'date' => $date,
            'records' => $recordRows,
        ]);
    }

    private function shouldFillMissingUsersOnAttendanceList(Request $request): bool
    {
        $user = $request->user();
        if ($user === null) {
            return false;
        }
        $isAdminRole = method_exists($user, 'hasRole') && $user->hasRole('admin');

        if (! $isAdminRole) {
            if ($request->filled('user_id')) {
                return false;
            }
            if ($request->filled('device_type')) {
                return false;
            }
            if ($request->filled('is_within_radius')) {
                return false;
            }

            return $this->resolveSingleCalendarDayForAttendanceList($request) !== null;
        }

        if ($request->filled('user_id')) {
            return false;
        }
        if ($request->filled('device_type')) {
            return false;
        }
        if ($request->filled('is_within_radius')) {
            return false;
        }
        if ($request->filled('status')) {
            $status = (string) $request->query('status');
            if ($status !== AttendanceRecord::STATUS_ABSENT) {
                return false;
            }
        }

        return $this->resolveSingleCalendarDayForAttendanceList($request) !== null;
    }

    private function resolveSingleCalendarDayForAttendanceList(Request $request): ?string
    {
        $from = $request->query('from');
        $to = $request->query('to');
        if (is_string($from) && is_string($to) && $from !== '' && $from === $to) {
            return $from;
        }
        $date = $request->query('date');
        if (is_string($date) && $date !== '' && ! $request->filled('from') && ! $request->filled('to')) {
            return $date;
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeNoRecordAttendanceListRow(User $target, string $date, User $viewer): array
    {
        $tz = $this->attendanceService->resolveTimezone($viewer);

        return [
            'id' => null,
            'user_id' => $target->id,
            'user_name' => $target->name,
            'date' => $date,
            'check_in_at' => null,
            'check_out_at' => null,
            'check_in_at_local' => null,
            'check_out_at_local' => null,
            'is_late' => false,
            'status' => null,
            'worked_minutes' => null,
            'worked_hours' => null,
            'shift_open' => false,
            'device_type' => null,
            'is_within_radius' => null,
            'distance_from_office_m' => null,
            'notes' => null,
            'timezone_used' => $tz,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeListRecord(AttendanceRecord $r, User $viewer, ?AttendanceLog $clockInLog = null): array
    {
        $tz = $this->attendanceService->resolveTimezone($viewer);
        $geo = $this->attendanceService->clockInGeoMetaFromRecordAndLog($r, $clockInLog);

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
            'worked_hours' => $this->attendanceService->workedHoursForList($r),
            'shift_open' => $this->attendanceService->shiftOpenForList($r),
            'device_type' => $geo['device_type'],
            'is_within_radius' => $geo['is_within_radius'],
            'distance_from_office_m' => $geo['distance_from_office_m'],
            'notes' => $r->notes,
            'timezone_used' => $tz,
        ];
    }
}
