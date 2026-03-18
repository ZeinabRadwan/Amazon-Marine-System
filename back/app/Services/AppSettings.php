<?php

namespace App\Services;

use App\Models\AppSetting;

class AppSettings
{
    public const KEY_COMPANY_PROFILE = 'company.profile';

    public const KEY_COMPANY_LOCATION = 'company.location';

    public const KEY_SYSTEM_PREFERENCES = 'system.preferences';

    public const KEY_NOTIFICATIONS_PREFERENCES = 'notifications.preferences';

    public const KEY_SESSIONS_RESET_HOUR = 'sessions.reset_hour';

    public const KEY_SESSIONS_IDLE_LOGOUT_MINUTES = 'sessions.idle_logout_minutes';

    /**
     * @return array<string, mixed>|null
     */
    public function getArray(string $key): ?array
    {
        $setting = AppSetting::query()->where('key', $key)->first();

        if (! $setting) {
            return null;
        }

        return is_array($setting->value) ? $setting->value : null;
    }

    public function getInt(string $key, int $default): int
    {
        $setting = AppSetting::query()->where('key', $key)->first();

        if (! $setting) {
            return $default;
        }

        $value = $setting->value;
        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) && is_numeric($value)) {
            return (int) $value;
        }

        return $default;
    }

    /**
     * @param  array<string, mixed>|null  $value
     */
    public function setArray(string $key, ?array $value): AppSetting
    {
        return AppSetting::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }

    public function setInt(string $key, int $value): AppSetting
    {
        return AppSetting::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }
}
