<?php

namespace App\Http\Requests\Attendance;

use App\Models\Excuse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminUpdateExcuseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('attendance.admin') ?? false;
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
