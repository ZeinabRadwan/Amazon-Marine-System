<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('clients.manage') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['sometimes', 'nullable', 'integer', 'exists:clients,id'],
            'vendor_id' => ['sometimes', 'nullable', 'integer', 'exists:vendors,id'],
            'subject' => ['sometimes', 'string', 'max:255'],
            'purpose' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'visit_date' => ['sometimes', 'date'],
            'status' => ['sometimes', 'string', 'max:30'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->filled('client_id') && $this->filled('vendor_id')) {
                $validator->errors()->add('client_id', 'Provide either client_id or vendor_id, not both.');
            }
        });
    }
}

