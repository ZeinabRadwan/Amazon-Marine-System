<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSessionSettingsRequest extends FormRequest
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
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'reset_hour' => ['sometimes', 'integer', 'min:0', 'max:23'],
            'idle_logout_minutes' => ['sometimes', 'integer', 'min:1', 'max:1440'],
        ];
    }
}
