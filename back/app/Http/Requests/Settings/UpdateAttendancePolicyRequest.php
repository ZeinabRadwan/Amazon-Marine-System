<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAttendancePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->hasRole('admin')
            || $user?->can('roles.manage')
            || $user?->can('permissions.manage')
            || false;
    }

    /**
     * @return array<string, array<int, string|object>>
     */
    public function rules(): array
    {
        return [
            'grace_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:240'],
            'workday_start' => ['sometimes', 'nullable', 'date_format:H:i'],
            'workday_end' => ['sometimes', 'nullable', 'date_format:H:i'],
            'enforce_geofence' => ['sometimes', 'boolean'],
            'enforce_schedule' => ['sometimes', 'boolean'],
            'require_location' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): array
    {
        /** @var array<string, mixed> $v */
        $v = parent::validated($key, $default);

        foreach (['enforce_geofence', 'enforce_schedule', 'require_location'] as $boolKey) {
            if (array_key_exists($boolKey, $v) && is_string($v[$boolKey])) {
                $v[$boolKey] = filter_var($v[$boolKey], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
            }
        }

        return $v;
    }
}
