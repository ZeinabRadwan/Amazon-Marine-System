<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tickets.manage') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $id = $this->route('ticketStatus')?->id;

        return [
            'key' => ['sometimes', 'required', 'string', 'max:40', Rule::unique('ticket_statuses', 'key')->ignore($id)],
            'label_ar' => ['sometimes', 'required', 'string', 'max:100'],
            'label_en' => ['sometimes', 'nullable', 'string', 'max:100'],
            'active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}
