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

    public function rules(): array
    {
        return [
            'client_id' => ['required_without_all:vendor_id,other_name', 'nullable', 'integer', 'exists:clients,id'],
            'vendor_id' => ['required_without_all:client_id,other_name', 'nullable', 'integer', 'exists:vendors,id'],
            'other_name' => ['required_without_all:client_id,vendor_id', 'nullable', 'string', 'max:255'],
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
            $provided = collect([
                'client_id' => $this->filled('client_id'),
                'vendor_id' => $this->filled('vendor_id'),
                'other_name' => $this->filled('other_name'),
            ])->filter();

            if ($provided->count() > 1) {
                $validator->errors()->add('client_id', 'Provide only one of client_id, vendor_id, or other_name.');
            }
        });
    }
}

