<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('ticket')) ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'ticket_type_id' => ['sometimes', 'integer', 'exists:ticket_types,id'],
            'priority_id' => ['sometimes', 'integer', 'exists:ticket_priorities,id'],
            'subject' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:open,in_progress,waiting,closed'],
        ];
    }
}
