<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketPriorityRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:50', 'unique:ticket_priorities,name'],
            'label_ar' => ['required', 'string', 'max:100'],
            'label_en' => ['required', 'string', 'max:100'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}
