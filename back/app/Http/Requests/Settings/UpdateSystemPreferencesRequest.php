<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSystemPreferencesRequest extends FormRequest
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
            'timezone' => ['sometimes', 'nullable', 'string', 'max:100'],
            'currency' => ['sometimes', 'nullable', 'string', 'max:10'],
            'date_format' => ['sometimes', 'nullable', 'string', 'max:30'],
            'default_tax_pct' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
