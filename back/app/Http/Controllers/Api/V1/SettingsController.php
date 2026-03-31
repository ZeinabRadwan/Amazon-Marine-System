<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateAttendancePolicyRequest;
use App\Http\Requests\Settings\UpdateCompanyLocationRequest;
use App\Http\Requests\Settings\UpdateCompanyProfileRequest;
use App\Http\Requests\Settings\UpdateNotificationPreferencesRequest;
use App\Http\Requests\Settings\UpdateOfficeLocationRequest;
use App\Http\Requests\Settings\UpdateSessionSettingsRequest;
use App\Http\Requests\Settings\UpdateSystemPreferencesRequest;
use App\Http\Responses\ApiResponse;
use App\Models\OfficeLocation;
use App\Services\AppSettings;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(
        private readonly AppSettings $settings,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $companyProfile = $this->settings->getArray(AppSettings::KEY_COMPANY_PROFILE) ?? [];
        $companyLocation = $this->resolveCompanyLocationForShow();
        $systemPreferences = $this->settings->getArray(AppSettings::KEY_SYSTEM_PREFERENCES) ?? [];
        $notificationPreferences = $this->settings->getArray(AppSettings::KEY_NOTIFICATIONS_PREFERENCES) ?? [];

        $resetHour = $this->settings->getInt(AppSettings::KEY_SESSIONS_RESET_HOUR, 0);
        $idleLogoutMinutes = $this->settings->getInt(AppSettings::KEY_SESSIONS_IDLE_LOGOUT_MINUTES, 30);

        $attendancePolicy = array_merge(
            $this->defaultAttendancePolicy(),
            $this->settings->getArray(AppSettings::KEY_ATTENDANCE_POLICY) ?? []
        );

        return response()->json([
            'data' => [
                'company' => [
                    'profile' => $companyProfile,
                    'location' => $companyLocation,
                ],
                'system' => [
                    'preferences' => array_merge([
                        'timezone' => config('app.timezone'),
                        'currency' => 'USD',
                        'date_format' => 'DD/MM/YYYY',
                        'default_tax_pct' => 14,
                    ], $systemPreferences),
                ],
                'notifications' => [
                    'preferences' => array_merge([
                        'shipments' => true,
                        'finance' => true,
                        'crm' => true,
                        'email' => false,
                        'docs_expiry' => true,
                    ], $notificationPreferences),
                ],
                'sessions' => [
                    'reset_hour' => $resetHour,
                    'idle_logout_minutes' => $idleLogoutMinutes,
                ],
                'attendance' => [
                    'policy' => $attendancePolicy,
                ],
            ],
        ]);
    }

    public function officeLocationShow(): JsonResponse
    {
        $row = OfficeLocation::current();
        if ($row === null || $row->lat === null || $row->lng === null) {
            $fallback = $this->settings->getArray(AppSettings::KEY_COMPANY_LOCATION);

            return ApiResponse::success([
                'lat' => isset($fallback['lat']) ? (float) $fallback['lat'] : null,
                'lng' => isset($fallback['lng']) ? (float) $fallback['lng'] : null,
                'radius_meters' => isset($fallback['radius_m']) ? ($fallback['radius_m'] !== null ? (int) $fallback['radius_m'] : null) : null,
            ]);
        }

        return ApiResponse::success([
            'lat' => (float) $row->lat,
            'lng' => (float) $row->lng,
            'radius_meters' => $row->radius_meters,
        ]);
    }

    public function officeLocationUpdate(UpdateOfficeLocationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $radiusMeters = array_key_exists('radius_meters', $validated)
            ? ($validated['radius_meters'] === null ? null : (int) $validated['radius_meters'])
            : null;

        $this->persistOfficeLocation(
            (float) $validated['lat'],
            (float) $validated['lng'],
            $radiusMeters
        );

        return ApiResponse::success([
            'lat' => (float) $validated['lat'],
            'lng' => (float) $validated['lng'],
            'radius_meters' => $radiusMeters,
        ], 'Office location saved.');
    }

    public function updateAttendancePolicy(UpdateAttendancePolicyRequest $request): JsonResponse
    {
        $existing = $this->settings->getArray(AppSettings::KEY_ATTENDANCE_POLICY) ?? [];
        $updated = array_merge($this->defaultAttendancePolicy(), $existing, $request->validated());

        $this->settings->setArray(AppSettings::KEY_ATTENDANCE_POLICY, $updated);

        ActivityLogger::log('settings.attendance_policy_updated', null, [
            'policy' => $updated,
        ]);

        return ApiResponse::success(['policy' => $updated], 'Attendance policy saved.');
    }

    public function updateCompanyProfile(UpdateCompanyProfileRequest $request): JsonResponse
    {
        $existing = $this->settings->getArray(AppSettings::KEY_COMPANY_PROFILE) ?? [];
        $updated = array_merge($existing, $request->validated());

        $this->settings->setArray(AppSettings::KEY_COMPANY_PROFILE, $updated);

        ActivityLogger::log('settings.company_profile_updated', null, [
            'profile' => $request->validated(),
        ]);

        return $this->show($request);
    }

    public function updateCompanyLocation(UpdateCompanyLocationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $radiusM = array_key_exists('radius_m', $validated) ? ($validated['radius_m'] === null ? null : (int) $validated['radius_m']) : null;

        $this->persistOfficeLocation(
            (float) $validated['lat'],
            (float) $validated['lng'],
            $radiusM
        );

        ActivityLogger::log('settings.company_location_updated', null, [
            'lat' => (float) $validated['lat'],
            'lng' => (float) $validated['lng'],
            'radius_m' => $radiusM,
        ]);

        return $this->show($request);
    }

    public function updateSystemPreferences(UpdateSystemPreferencesRequest $request): JsonResponse
    {
        $existing = $this->settings->getArray(AppSettings::KEY_SYSTEM_PREFERENCES) ?? [];
        $updated = array_merge($existing, $request->validated());

        $this->settings->setArray(AppSettings::KEY_SYSTEM_PREFERENCES, $updated);

        ActivityLogger::log('settings.system_preferences_updated', null, [
            'changes' => $request->validated(),
        ]);

        return $this->show($request);
    }

    public function updateNotificationPreferences(UpdateNotificationPreferencesRequest $request): JsonResponse
    {
        $existing = $this->settings->getArray(AppSettings::KEY_NOTIFICATIONS_PREFERENCES) ?? [];
        $updated = array_merge($existing, $request->validated());

        $this->settings->setArray(AppSettings::KEY_NOTIFICATIONS_PREFERENCES, $updated);

        ActivityLogger::log('settings.notification_preferences_updated', null, [
            'changes' => $request->validated(),
        ]);

        return $this->show($request);
    }

    public function updateSessionSettings(UpdateSessionSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (array_key_exists('reset_hour', $validated)) {
            $this->settings->setInt(AppSettings::KEY_SESSIONS_RESET_HOUR, (int) $validated['reset_hour']);
        }

        if (array_key_exists('idle_logout_minutes', $validated)) {
            $this->settings->setInt(AppSettings::KEY_SESSIONS_IDLE_LOGOUT_MINUTES, (int) $validated['idle_logout_minutes']);
        }

        ActivityLogger::log('settings.session_settings_updated', null, $validated);

        return $this->show($request);
    }

    /**
     * @return array{lat: float, lng: float, radius_m: int|null}|null
     */
    private function resolveCompanyLocationForShow(): ?array
    {
        $row = OfficeLocation::current();
        if ($row !== null && $row->lat !== null && $row->lng !== null) {
            return [
                'lat' => (float) $row->lat,
                'lng' => (float) $row->lng,
                'radius_m' => $row->radius_meters,
            ];
        }

        $fromSettings = $this->settings->getArray(AppSettings::KEY_COMPANY_LOCATION);

        return is_array($fromSettings) ? $fromSettings : null;
    }

    private function persistOfficeLocation(float $lat, float $lng, ?int $radiusMeters): void
    {
        OfficeLocation::upsertSingleton([
            'lat' => $lat,
            'lng' => $lng,
            'radius_meters' => $radiusMeters,
        ]);

        $this->settings->setArray(AppSettings::KEY_COMPANY_LOCATION, [
            'lat' => $lat,
            'lng' => $lng,
            'radius_m' => $radiusMeters,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultAttendancePolicy(): array
    {
        return [
            'grace_minutes' => 15,
            'workday_start' => '09:00',
            'workday_end' => '17:00',
            'enforce_geofence' => false,
            'enforce_schedule' => false,
            'require_location' => true,
        ];
    }
}
