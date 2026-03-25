<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketPriorityRequest extends FormRequest
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
        $id = $this->route('ticketPriority')?->id;

        return [
            'name' => ['sometimes', 'string', 'max:50', Rule::unique('ticket_priorities', 'name')->ignore($id)],
            'label_ar' => ['sometimes', 'required', 'string', 'max:100'],
            'label_en' => ['sometimes', 'required', 'string', 'max:100'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}
