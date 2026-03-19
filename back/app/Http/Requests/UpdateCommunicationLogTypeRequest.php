<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCommunicationLogTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('customer_service.manage_comms') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $id = $this->route('communicationLogType')?->id;

        return [
            'name' => ['sometimes', 'string', 'max:50', Rule::unique('communication_log_types', 'name')->ignore($id)],
            'label_ar' => ['sometimes', 'nullable', 'string', 'max:100'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}
