<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AttendanceRecord;
use App\Models\Excuse;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AdminAttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $q = $this->filteredQuery($request)->orderByDesc('date')->orderByDesc('check_in_at');
        $perPage = min(200, max(1, (int) $request->query('per_page', 50)));
        $paginator = $q->paginate($perPage);

        $viewer = $request->user();
        $records = $paginator->getCollection();
        $excuseMap = $this->loadExcuseMapForRecords($records);

        $items = $records->map(function (AttendanceRecord $r) use ($viewer, $excuseMap) {
            $user = $r->user ?? $viewer;
            $tz = $this->attendanceService->resolveTimezone($user);
            $key = $r->user_id.'|'.$r->date->toDateString();
            $excuse = $excuseMap[$key] ?? null;

            return [
                'id' => $r->id,
                'employee_id' => $r->user_id,
                'employee_name' => $r->user?->name,
                'department' => null,
                'date' => $r->date->toDateString(),
                'clock_in_at' => $r->check_in_at?->toIso8601String(),
                'clock_out_at' => $r->check_out_at?->toIso8601String(),
                'clock_in_at_local' => $r->check_in_at ? $r->check_in_at->copy()->timezone($tz)->toIso8601String() : null,
                'clock_out_at_local' => $r->check_out_at ? $r->check_out_at->copy()->timezone($tz)->toIso8601String() : null,
                'worked_hours' => $r->worked_minutes !== null ? round($r->worked_minutes / 60, 2) : null,
                'worked_minutes' => $r->worked_minutes,
                'device_type' => $r->clock_in_device_type,
                'is_within_radius' => $r->clock_in_is_within_radius,
                'distance_from_office_m' => $r->clock_in_distance_from_office,
                'status' => $r->status,
                'is_late' => (bool) $r->is_late,
                'excuse' => $excuse ? [
                    'id' => $excuse->id,
                    'status' => $excuse->status,
                    'reason' => $excuse->reason,
                ] : null,
                'timezone_used' => $tz,
            ];
        });

        return ApiResponse::success([
            'items' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $base = $this->filteredQuery($request);
        $lateStatus = AttendanceRecord::STATUS_LATE;

        $rows = (clone $base)
            ->select('user_id')
            ->selectRaw('COUNT(*) as total_days')
            ->selectRaw('SUM(CASE WHEN status = ? OR is_late = 1 THEN 1 ELSE 0 END) as late_count', [$lateStatus])
            ->selectRaw('SUM(CASE WHEN check_in_at IS NULL THEN 1 ELSE 0 END) as absent_count')
            ->selectRaw('AVG(worked_minutes) as avg_worked_minutes')
            ->groupBy('user_id')
            ->get();

        $users = User::query()->whereIn('id', $rows->pluck('user_id'))->get()->keyBy('id');

        $data = $rows->map(function ($row) use ($users) {
            $avgMin = $row->avg_worked_minutes;

            return [
                'employee_id' => (int) $row->user_id,
                'employee_name' => $users->get($row->user_id)?->name,
                'total_days' => (int) $row->total_days,
                'late_count' => (int) $row->late_count,
                'absent_count' => (int) $row->absent_count,
                'avg_worked_hours' => $avgMin !== null ? round((float) $avgMin / 60, 2) : null,
                'avg_worked_minutes' => $avgMin !== null ? round((float) $avgMin, 1) : null,
            ];
        });

        return ApiResponse::success($data);
    }

    /**
     * @return Builder<AttendanceRecord>
     */
    private function filteredQuery(Request $request): Builder
    {
        $q = AttendanceRecord::query()->with('user');

        if ($request->filled('employee_id')) {
            $q->where('user_id', (int) $request->query('employee_id'));
        }

        if ($request->filled('date_from')) {
            $q->whereDate('date', '>=', $request->query('date_from'));
        }

        if ($request->filled('date_to')) {
            $q->whereDate('date', '<=', $request->query('date_to'));
        }

        if ($request->filled('status')) {
            $status = (string) $request->query('status');
            if ($status === AttendanceRecord::STATUS_ABSENT) {
                $q->whereNull('check_in_at');
            } elseif ($status === AttendanceRecord::STATUS_EXCUSED) {
                $q->where('status', AttendanceRecord::STATUS_EXCUSED);
            } else {
                $q->where('status', $status);
            }
        }

        if ($request->filled('device_type')) {
            $q->where('clock_in_device_type', $request->query('device_type'));
        }

        if ($request->filled('is_within_radius')) {
            $raw = $request->query('is_within_radius');
            if ($raw === '1' || $raw === '0' || $raw === 1 || $raw === 0) {
                $q->where('clock_in_is_within_radius', filter_var($raw, FILTER_VALIDATE_BOOLEAN));
            }
        }

        return $q;
    }

    /**
     * @param  Collection<int, AttendanceRecord>  $records
     * @return array<string, Excuse>
     */
    private function loadExcuseMapForRecords(Collection $records): array
    {
        if ($records->isEmpty()) {
            return [];
        }

        $pairs = $records->map(fn (AttendanceRecord $r) => [
            'user_id' => $r->user_id,
            'date' => $r->date->toDateString(),
        ])->unique(fn (array $p) => $p['user_id'].'|'.$p['date'])->values();

        $query = Excuse::query()->where(function (Builder $q) use ($pairs) {
            foreach ($pairs as $p) {
                $q->orWhere(function (Builder $q2) use ($p) {
                    $q2->where('user_id', $p['user_id'])->whereDate('date', $p['date']);
                });
            }
        });

        $map = [];
        foreach ($query->get() as $excuse) {
            $key = $excuse->user_id.'|'.$excuse->date->toDateString();
            $map[$key] = $excuse;
        }

        return $map;
    }
}
