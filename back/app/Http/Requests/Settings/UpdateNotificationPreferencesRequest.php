<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationPreferencesRequest extends FormRequest
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
            'shipments' => ['sometimes', 'boolean'],
            'finance' => ['sometimes', 'boolean'],
            'crm' => ['sometimes', 'boolean'],
            'email' => ['sometimes', 'boolean'],
            'docs_expiry' => ['sometimes', 'boolean'],
        ];
    }
}
