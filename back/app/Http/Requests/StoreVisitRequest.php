<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreVisitRequest extends FormRequest
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
            'client_id' => ['required_without:vendor_id', 'nullable', 'integer', 'exists:clients,id'],
            'vendor_id' => ['required_without:client_id', 'nullable', 'integer', 'exists:vendors,id'],
            'subject' => ['required', 'string', 'max:255'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'visit_date' => ['required', 'date'],
            'status' => ['nullable', 'string', 'max:30'],
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

