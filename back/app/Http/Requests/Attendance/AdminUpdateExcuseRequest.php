<?php

namespace App\Http\Requests\Attendance;

use App\Models\Excuse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminUpdateExcuseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        return $user->can('attendance.excuses.manage') || $user->can('attendance.admin');
    }

    /**
     * @return array<string, array<int, string|object>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in([Excuse::STATUS_APPROVED, Excuse::STATUS_REJECTED])],
            'admin_note' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
