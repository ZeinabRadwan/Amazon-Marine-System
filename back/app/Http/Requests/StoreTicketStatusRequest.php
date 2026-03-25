<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketStatusRequest extends FormRequest
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
        return [
            'key' => ['required', 'string', 'max:40', 'unique:ticket_statuses,key'],
            'label_ar' => ['required', 'string', 'max:100'],
            'label_en' => ['required', 'string', 'max:100'],
            'active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}
