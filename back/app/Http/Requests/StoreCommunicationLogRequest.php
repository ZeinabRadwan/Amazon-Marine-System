<?php

namespace App\Http\Requests;

use App\Models\CommunicationLog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreCommunicationLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', CommunicationLog::class) ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
            'ticket_id' => ['nullable', 'integer', 'exists:tickets,id'],
            'communication_log_type_id' => ['required', 'integer', 'exists:communication_log_types,id'],
            'subject' => ['nullable', 'string', 'max:255'],
            'client_said' => ['nullable', 'string', 'max:65535'],
            'issue' => ['nullable', 'string', 'max:65535'],
            'reply' => ['nullable', 'string', 'max:65535'],
            'occurred_at' => ['nullable', 'date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('client_id') && ! $this->filled('shipment_id') && ! $this->filled('ticket_id')) {
                $validator->errors()->add(
                    'client_id',
                    'At least one of client_id, shipment_id, or ticket_id is required.'
                );
            }
        });
    }
}
