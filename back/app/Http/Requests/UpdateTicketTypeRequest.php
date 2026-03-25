<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('ticket_type')) ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $id = $this->route('ticket_type')?->id;

        return [
            'name' => ['sometimes', 'string', 'max:50', Rule::unique('ticket_types', 'name')->ignore($id)],
            'label_ar' => ['sometimes', 'required', 'string', 'max:100'],
            'label_en' => ['sometimes', 'required', 'string', 'max:100'],
        ];
    }
}
