<?php

namespace App\Services;

use App\Models\AttendanceLog;
use App\Models\AttendanceRecord;
use App\Models\OfficeLocation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AttendanceService
{
    public function __construct(
        private readonly AppSettings $settings,
        private readonly DeviceTypeResolver $deviceTypeResolver,
    ) {}

    /**
     * @return array{success: bool, message: ?string, data?: array<string, mixed>}
     */
    public function clockIn(User $user, Request $request): array
    {
        $policy = $this->mergedPolicy();
        $now = Carbon::now('UTC');
        $today = $now->copy()->utc()->toDateString();
        $deviceType = $this->deviceTypeResolver->resolve($request->userAgent());
        $ip = $request->ip();

        $coords = GeoDistance::parseCoordinates($request->input('latitude'), $request->input('longitude'));
        if (($policy['require_location'] ?? true) && ! $coords['ok']) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_IN, $now, $deviceType, $ip, null, null, null, null, false, 'Invalid or missing coordinates.');

            return ['success' => false, 'message' => 'Valid latitude and longitude are required.'];
        }

        $lat = $coords['ok'] ? $coords['lat'] : null;
        $lng = $coords['ok'] ? $coords['lng'] : null;

        $office = OfficeLocation::current();
        [$distance, $within] = $this->evaluateGeofence($office, $lat, $lng);

        if (($policy['enforce_geofence'] ?? false) && ! $this->geofenceIsSatisfied($office, $within)) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_IN, $now, $deviceType, $ip, $lat, $lng, $distance, $within, false, 'Outside office radius or geofence not configured.');

            return ['success' => false, 'message' => 'Clock-in rejected: you are outside the allowed office area.'];
        }

        $tz = $this->resolveTimezone($user);
        $scheduleNote = $this->scheduleGateMessage($policy, $now, $tz, true);
        if ($scheduleNote !== null) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_IN, $now, $deviceType, $ip, $lat, $lng, $distance, $within, false, $scheduleNote);

            return ['success' => false, 'message' => 'Clock-in rejected: '.$scheduleNote];
        }

        $existing = AttendanceRecord::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if ($existing && $existing->check_in_at && $existing->check_out_at) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_IN, $now, $deviceType, $ip, $lat, $lng, $distance, $within, false, 'Duplicate clock-in: attendance already complete for this date.');

            return ['success' => false, 'message' => 'Attendance for today is already complete.'];
        }

        if ($existing && $existing->check_in_at && ! $existing->check_out_at) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_IN, $now, $deviceType, $ip, $lat, $lng, $distance, $within, false, 'Duplicate clock-in: already checked in without clock-out.');

            return ['success' => false, 'message' => 'Already checked in. Clock out before checking in again.'];
        }

        $isLate = $this->isLateForClockIn($policy, $now, $tz);
        $status = $isLate ? AttendanceRecord::STATUS_LATE : AttendanceRecord::STATUS_ON_TIME;

        if ($existing && ! $existing->check_in_at) {
            $existing->check_in_at = $now;
            $existing->is_late = $isLate;
            $existing->status = $status;
            $existing->clock_in_device_type = $deviceType;
            $existing->clock_in_distance_from_office = $distance;
            $existing->clock_in_is_within_radius = $within;
            if ($request->filled('notes')) {
                $existing->notes = trim((string) ($existing->notes ?? '').($existing->notes ? "\n" : '').$request->input('notes'));
            }
            $existing->save();
            $record = $existing->fresh('user');
        } else {
            $record = AttendanceRecord::query()->create([
                'user_id' => $user->id,
                'date' => $today,
                'check_in_at' => $now,
                'is_late' => $isLate,
                'status' => $status,
                'clock_in_device_type' => $deviceType,
                'clock_in_distance_from_office' => $distance,
                'clock_in_is_within_radius' => $within,
                'notes' => $request->input('notes'),
            ]);
            $record->load('user');
        }

        $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_IN, $now, $deviceType, $ip, $lat, $lng, $distance, $within, true, null);

        return [
            'success' => true,
            'message' => 'Clock-in recorded.',
            'data' => $this->serializeRecord($record, $user, [
                'distance_from_office_m' => $distance,
                'is_within_radius' => $within,
                'device_type' => $deviceType,
            ]),
        ];
    }

    /**
     * @return array{success: bool, message: ?string, data?: array<string, mixed>}
     */
    public function clockOut(User $user, Request $request): array
    {
        $policy = $this->mergedPolicy();
        $now = Carbon::now('UTC');
        $today = $now->copy()->utc()->toDateString();
        $deviceType = $this->deviceTypeResolver->resolve($request->userAgent());
        $ip = $request->ip();

        $coords = GeoDistance::parseCoordinates($request->input('latitude'), $request->input('longitude'));
        if (($policy['require_location'] ?? true) && ! $coords['ok']) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_OUT, $now, $deviceType, $ip, null, null, null, null, false, 'Invalid or missing coordinates.');

            return ['success' => false, 'message' => 'Valid latitude and longitude are required.'];
        }

        $lat = $coords['ok'] ? $coords['lat'] : null;
        $lng = $coords['ok'] ? $coords['lng'] : null;

        $office = OfficeLocation::current();
        [$distance, $within] = $this->evaluateGeofence($office, $lat, $lng);

        if (($policy['enforce_geofence'] ?? false) && ! $this->geofenceIsSatisfied($office, $within)) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_OUT, $now, $deviceType, $ip, $lat, $lng, $distance, $within, false, 'Outside office radius or geofence not configured.');

            return ['success' => false, 'message' => 'Clock-out rejected: you are outside the allowed office area.'];
        }

        $tz = $this->resolveTimezone($user);
        $scheduleNote = $this->scheduleGateMessage($policy, $now, $tz, false);
        if ($scheduleNote !== null) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_OUT, $now, $deviceType, $ip, $lat, $lng, $distance, $within, false, $scheduleNote);

            return ['success' => false, 'message' => 'Clock-out rejected: '.$scheduleNote];
        }

        $record = AttendanceRecord::query()
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if (! $record || ! $record->check_in_at) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_OUT, $now, $deviceType, $ip, $lat, $lng, $distance, $within, false, 'No check-in found for today.');

            return ['success' => false, 'message' => 'No check-in found for today. Check in first.'];
        }

        if ($record->check_out_at) {
            $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_OUT, $now, $deviceType, $ip, $lat, $lng, $distance, $within, false, 'Duplicate clock-out.');

            return ['success' => false, 'message' => 'Already checked out for today.'];
        }

        $record->check_out_at = $now;
        if ($request->filled('notes')) {
            $record->notes = trim((string) ($record->notes ?? '').($record->notes ? "\n" : '').$request->input('notes'));
        }

        $minutes = (int) round($record->check_in_at->diffInSeconds($record->check_out_at) / 60);
        $record->worked_minutes = max(0, $minutes);

        $earlyLeave = $this->isEarlyLeave($policy, $now, $tz);
        if ($earlyLeave) {
            $record->status = AttendanceRecord::STATUS_EARLY_LEAVE;
        } elseif ($record->is_late) {
            $record->status = AttendanceRecord::STATUS_LATE;
        } else {
            $record->status = AttendanceRecord::STATUS_ON_TIME;
        }

        $record->save();
        $record->load('user');

        $this->writeLog($user->id, AttendanceLog::TYPE_CLOCK_OUT, $now, $deviceType, $ip, $lat, $lng, $distance, $within, true, null);

        return [
            'success' => true,
            'message' => 'Clock-out recorded.',
            'data' => $this->serializeRecord($record, $user, [
                'distance_from_office_m' => $distance,
                'is_within_radius' => $within,
                'device_type' => $deviceType,
            ]),
        ];
    }

    public function resolveTimezone(User $user): string
    {
        if ($user->timezone && in_array($user->timezone, timezone_identifiers_list(), true)) {
            return $user->timezone;
        }

        $system = $this->settings->getArray(AppSettings::KEY_SYSTEM_PREFERENCES) ?? [];
        if (! empty($system['timezone']) && is_string($system['timezone']) && in_array($system['timezone'], timezone_identifiers_list(), true)) {
            return $system['timezone'];
        }

        return config('app.timezone', 'UTC');
    }

    /**
     * @return array<string, mixed>
     */
    public function mergedPolicy(): array
    {
        return array_merge([
            'grace_minutes' => 15,
            'workday_start' => '09:00',
            'workday_end' => '17:00',
            'enforce_geofence' => false,
            'enforce_schedule' => false,
            'require_location' => true,
        ], $this->settings->getArray(AppSettings::KEY_ATTENDANCE_POLICY) ?? []);
    }

    /**
     * @return array{0: float|null, 1: bool|null}
     */
    private function evaluateGeofence(?OfficeLocation $office, ?float $lat, ?float $lng): array
    {
        if ($office === null || $office->lat === null || $office->lng === null || $lat === null || $lng === null) {
            return [null, null];
        }

        $distance = GeoDistance::metersBetween((float) $office->lat, (float) $office->lng, $lat, $lng);
        $radius = $office->radius_meters;
        if ($radius === null || $radius <= 0) {
            return [$distance, true];
        }

        return [$distance, $distance <= (float) $radius];
    }

    private function geofenceIsSatisfied(?OfficeLocation $office, ?bool $within): bool
    {
        if ($office === null || $office->lat === null || $office->lng === null || $office->radius_meters === null || $office->radius_meters <= 0) {
            return false;
        }

        return $within === true;
    }

    /**
     * @param  array<string, mixed>  $policy
     */
    private function scheduleGateMessage(array $policy, Carbon $nowUtc, string $tz, bool $isClockIn): ?string
    {
        if (! ($policy['enforce_schedule'] ?? false)) {
            return null;
        }

        $startStr = $policy['workday_start'] ?? null;
        $endStr = $policy['workday_end'] ?? null;
        if (! is_string($startStr) || ! is_string($endStr)) {
            return 'Work schedule is not configured.';
        }

        $nowLocal = $nowUtc->copy()->timezone($tz);
        $dateStr = $nowLocal->toDateString();

        try {
            $start = Carbon::parse($dateStr.' '.$startStr, $tz);
            Carbon::parse($dateStr.' '.$endStr, $tz);
        } catch (\Throwable) {
            return 'Invalid work schedule configuration.';
        }

        if ($isClockIn) {
            if ($nowLocal->lt($start)) {
                return 'Before allowed clock-in time.';
            }
            // No upper bound on clock-in time: workday_end + grace is not enforced here so late same-day
            // arrivals are not rejected after the nominal shift end (lateness is reflected in status).
        } else {
            if ($nowLocal->lt($start)) {
                return 'Before work hours.';
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $policy
     */
    private function isLateForClockIn(array $policy, Carbon $nowUtc, string $tz): bool
    {
        $startStr = $policy['workday_start'] ?? '09:00';
        if (! is_string($startStr)) {
            return false;
        }

        $grace = (int) ($policy['grace_minutes'] ?? 0);
        $nowLocal = $nowUtc->copy()->timezone($tz);
        $dateStr = $nowLocal->toDateString();

        try {
            $expectedStart = Carbon::parse($dateStr.' '.$startStr, $tz)->addMinutes($grace);
        } catch (\Throwable) {
            return false;
        }

        return $nowLocal->gt($expectedStart);
    }

    /**
     * @param  array<string, mixed>  $policy
     */
    private function isEarlyLeave(array $policy, Carbon $nowUtc, string $tz): bool
    {
        $endStr = $policy['workday_end'] ?? '17:00';
        if (! is_string($endStr)) {
            return false;
        }

        $grace = (int) ($policy['grace_minutes'] ?? 0);
        $nowLocal = $nowUtc->copy()->timezone($tz);
        $dateStr = $nowLocal->toDateString();

        try {
            $expectedEnd = Carbon::parse($dateStr.' '.$endStr, $tz)->subMinutes($grace);
        } catch (\Throwable) {
            return false;
        }

        return $nowLocal->lt($expectedEnd);
    }

    private function writeLog(
        int $userId,
        string $type,
        Carbon $attemptedAt,
        string $deviceType,
        ?string $ip,
        ?float $lat,
        ?float $lng,
        ?float $distance,
        ?bool $within,
        bool $accepted,
        ?string $note
    ): void {
        AttendanceLog::query()->create([
            'user_id' => $userId,
            'type' => $type,
            'attempted_at' => $attemptedAt,
            'device_type' => $deviceType,
            'ip_address' => $ip,
            'latitude' => $lat,
            'longitude' => $lng,
            'distance_from_office' => $distance,
            'is_within_radius' => $within,
            'accepted' => $accepted,
            'note' => $note,
        ]);
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function serializeRecord(AttendanceRecord $record, User $viewer, array $extra = []): array
    {
        $tz = $this->resolveTimezone($viewer);

        return array_merge([
            'id' => $record->id,
            'user_id' => $record->user_id,
            'user_name' => $record->user?->name,
            'date' => $record->date?->toDateString(),
            'check_in_at' => $record->check_in_at?->toIso8601String(),
            'check_out_at' => $record->check_out_at?->toIso8601String(),
            'check_in_at_local' => $record->check_in_at ? $record->check_in_at->copy()->timezone($tz)->toIso8601String() : null,
            'check_out_at_local' => $record->check_out_at ? $record->check_out_at->copy()->timezone($tz)->toIso8601String() : null,
            'is_late' => (bool) $record->is_late,
            'status' => $record->status,
            'worked_minutes' => $record->worked_minutes,
            'clock_in_device_type' => $record->clock_in_device_type,
            'distance_from_office_m' => $record->clock_in_distance_from_office,
            'is_within_radius' => $record->clock_in_is_within_radius,
            'notes' => $record->notes,
            'timezone_used' => $tz,
        ], $extra);
    }
}
