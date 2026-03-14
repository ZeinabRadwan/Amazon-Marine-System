<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    public function checkIn(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->toDateString();

        $record = AttendanceRecord::firstOrCreate(
            [
                'user_id' => $user->id,
                'date' => $today,
            ],
            [
                'check_in_at' => now(),
                'is_late' => $this->isLate(now()),
                'notes' => $request->input('notes'),
            ]
        );

        if ($record->wasRecentlyCreated === false && ! $record->check_in_at) {
            $record->check_in_at = now();
            $record->is_late = $this->isLate(now());
            if ($request->filled('notes')) {
                $record->notes = ($record->notes ? $record->notes . "\n" : '') . $request->input('notes');
            }
            $record->save();
        }

        return response()->json([
            'data' => $record->fresh('user'),
        ], 201);
    }

    public function checkOut(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->toDateString();

        $record = AttendanceRecord::where('user_id', $user->id)->whereDate('date', $today)->first();

        if (! $record) {
            return response()->json([
                'message' => 'No check-in found for today. Check in first.',
            ], 422);
        }

        $record->check_out_at = now();
        if ($request->filled('notes')) {
            $record->notes = ($record->notes ? $record->notes . "\n" : '') . $request->input('notes');
        }
        $record->save();

        return response()->json([
            'data' => $record->fresh('user'),
        ]);
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

        return response()->json([
            'data' => $records->map(fn (AttendanceRecord $r) => [
                'id' => $r->id,
                'user_id' => $r->user_id,
                'user_name' => $r->user?->name,
                'date' => $r->date?->toDateString(),
                'check_in_at' => $r->check_in_at?->toIso8601String(),
                'check_out_at' => $r->check_out_at?->toIso8601String(),
                'is_late' => (bool) $r->is_late,
                'notes' => $r->notes,
            ]),
        ]);
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
        $late = $records->where('is_late', true)->count();
        $activeUsersCount = (int) User::where('status', 'active')->count();
        $absent = max(0, $activeUsersCount - $present);

        return response()->json([
            'data' => [
                'date' => $date,
                'present' => $present,
                'left' => $left,
                'late' => $late,
                'absent' => $absent,
            ],
        ]);
    }

    public function today(Request $request): JsonResponse
    {
        $date = now()->toDateString();

        if ($request->user()?->can('attendance.view') || $request->user()?->can('reports.view')) {
            $records = AttendanceRecord::whereDate('date', $date)->with('user')->get();
        } else {
            $records = AttendanceRecord::where('user_id', $request->user()->id)->whereDate('date', $date)->with('user')->get();
        }

        return response()->json([
            'data' => [
                'date' => $date,
                'records' => $records->map(fn (AttendanceRecord $r) => [
                    'id' => $r->id,
                    'user_id' => $r->user_id,
                    'user_name' => $r->user?->name,
                    'check_in_at' => $r->check_in_at?->toIso8601String(),
                    'check_out_at' => $r->check_out_at?->toIso8601String(),
                    'is_late' => (bool) $r->is_late,
                ]),
            ],
        ]);
    }

    private function isLate(Carbon $checkInTime): bool
    {
        $expectedStart = $checkInTime->copy()->setTime(9, 0, 0);

        return $checkInTime->gt($expectedStart);
    }
}
