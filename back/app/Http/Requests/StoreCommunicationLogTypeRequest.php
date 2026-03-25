<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommunicationLogTypeRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:50', 'unique:communication_log_types,name'],
            'label_ar' => ['required', 'string', 'max:100'],
            'label_en' => ['required', 'string', 'max:100'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}
