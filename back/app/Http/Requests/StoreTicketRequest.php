<?php

namespace App\Http\Requests;

use App\Models\Ticket;
use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Ticket::class) ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
            'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
            'ticket_type_id' => ['required', 'integer', 'exists:ticket_types,id'],
            'priority_id' => ['required', 'integer', 'exists:ticket_priorities,id'],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'source' => ['nullable', 'string', 'max:30'],
        ];
    }
}
