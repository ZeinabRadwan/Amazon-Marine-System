<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('users.manage') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $userId = $this->route('user')?->id ?? null;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,'.$userId],
            'password' => ['sometimes', 'string', 'min:8'],
            'initials' => ['sometimes', 'nullable', 'string', 'max:4'],
            'status' => ['sometimes', 'string', 'in:active,inactive'],
            'role_id' => ['sometimes', 'integer', 'exists:roles,id'],
        ];
    }
}
