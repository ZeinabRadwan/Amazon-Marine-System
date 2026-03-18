<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateCompanyLocationRequest;
use App\Http\Requests\Settings\UpdateCompanyProfileRequest;
use App\Http\Requests\Settings\UpdateNotificationPreferencesRequest;
use App\Http\Requests\Settings\UpdateSessionSettingsRequest;
use App\Http\Requests\Settings\UpdateSystemPreferencesRequest;
use App\Services\AppSettings;
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
        $companyLocation = $this->settings->getArray(AppSettings::KEY_COMPANY_LOCATION) ?? null;
        $systemPreferences = $this->settings->getArray(AppSettings::KEY_SYSTEM_PREFERENCES) ?? [];
        $notificationPreferences = $this->settings->getArray(AppSettings::KEY_NOTIFICATIONS_PREFERENCES) ?? [];

        $resetHour = $this->settings->getInt(AppSettings::KEY_SESSIONS_RESET_HOUR, 0);
        $idleLogoutMinutes = $this->settings->getInt(AppSettings::KEY_SESSIONS_IDLE_LOGOUT_MINUTES, 30);

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
            ],
        ]);
    }

    public function updateCompanyProfile(UpdateCompanyProfileRequest $request): JsonResponse
    {
        $existing = $this->settings->getArray(AppSettings::KEY_COMPANY_PROFILE) ?? [];
        $updated = array_merge($existing, $request->validated());

        $this->settings->setArray(AppSettings::KEY_COMPANY_PROFILE, $updated);

        return $this->show($request);
    }

    public function updateCompanyLocation(UpdateCompanyLocationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $this->settings->setArray(AppSettings::KEY_COMPANY_LOCATION, [
            'lat' => (float) $validated['lat'],
            'lng' => (float) $validated['lng'],
            'radius_m' => array_key_exists('radius_m', $validated) ? ($validated['radius_m'] === null ? null : (int) $validated['radius_m']) : null,
        ]);

        return $this->show($request);
    }

    public function updateSystemPreferences(UpdateSystemPreferencesRequest $request): JsonResponse
    {
        $existing = $this->settings->getArray(AppSettings::KEY_SYSTEM_PREFERENCES) ?? [];
        $updated = array_merge($existing, $request->validated());

        $this->settings->setArray(AppSettings::KEY_SYSTEM_PREFERENCES, $updated);

        return $this->show($request);
    }

    public function updateNotificationPreferences(UpdateNotificationPreferencesRequest $request): JsonResponse
    {
        $existing = $this->settings->getArray(AppSettings::KEY_NOTIFICATIONS_PREFERENCES) ?? [];
        $updated = array_merge($existing, $request->validated());

        $this->settings->setArray(AppSettings::KEY_NOTIFICATIONS_PREFERENCES, $updated);

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

        return $this->show($request);
    }
}
